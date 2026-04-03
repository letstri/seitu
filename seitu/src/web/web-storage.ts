import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Readable, Subscribable, Writable } from '../core/index'
import type { Simplify } from '../utils'
import type { ValidationSchemaObjectErrorProps } from '../validate'
import { createReadableSubscription, createSubscription } from '../core/index'
import { validateSchema } from '../validate'

export type WebStorageInput = Record<string, StandardSchemaV1<unknown, unknown>>
export type WebStorageOutput<S extends WebStorageInput> = Simplify<{ [K in keyof S]: StandardSchemaV1.InferOutput<S[K]> }>

export interface WebStorageOptions<S extends WebStorageInput> {
  schemas: S
  defaultValues: WebStorageOutput<S>
  type: 'localStorage' | 'sessionStorage'
  keyTransform?: (key: keyof S) => string
  onValidationError?: (props: ValidationSchemaObjectErrorProps<WebStorageOutput<S>>) => void | StandardSchemaV1.InferOutput<S[keyof S]>
}

export interface WebStorage<O extends Record<string, unknown>> extends Subscribable<O>, Readable<O>, Writable<Partial<O>, O> {
  '~': {
    getDefaultValue: <K extends keyof O>(key: K) => O[K]
    type: 'localStorage' | 'sessionStorage'
  } & Subscribable<O>['~']
}

/**
 * Creates a reactive handle for a localStorage or sessionStorage instance.
 *
 * @example Vanilla
 * ```ts twoslash title="session-storage.ts"
 * import { createWebStorage } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: {
 *     token: z.string().nullable(),
 *     preferences: z.object({ theme: z.enum(['light', 'dark']) }),
 *   },
 *   defaultValues: { token: null, preferences: { theme: 'light' } },
 * })
 *
 * sessionStorage.get() // { token: null, preferences: { theme: 'light' } }
 * sessionStorage.set({ token: 'abc' })
 * sessionStorage.get() // { token: 'abc', preferences: { theme: 'light' } }
 * sessionStorage.subscribe(console.log)
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import { createWebStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * export default function Page() {
 *   const value = useSubscription(sessionStorage)
 *   return (
 *     <div>
 *       <span>{value.count}</span>
 *       <span>{value.name}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function createWebStorage<S extends WebStorageInput>(
  options: WebStorageOptions<S>,
): WebStorage<WebStorageOutput<S>> {
  const defaultValues = { ...options.defaultValues }
  const { subscribe, notify } = createSubscription({
    onFirstSubscribe: () => {
      const listener = (event: StorageEvent) => {
        if (Object.keys(defaultValues).some(key => String(options.keyTransform ? options.keyTransform(key) : key) === event.key)) {
          notify()
        }
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('storage', listener)
      }

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', listener)
        }
      }
    },
  })
  const keys = Object.keys(options.defaultValues) as (keyof WebStorageOutput<S>)[]
  const cachedRaws = new Map<keyof WebStorageOutput<S>, string | null>()
  let cachedOutput: WebStorageOutput<S> | undefined

  const get = () => {
    if (typeof window === 'undefined') {
      return options.defaultValues
    }

    const storage = window[options.type]

    let hasCache = cachedOutput !== undefined
    const currentRaws: Record<keyof WebStorageOutput<S>, string | null> = {} as Record<keyof WebStorageOutput<S>, string | null>

    for (const key of keys) {
      const storageKey = String(options.keyTransform ? options.keyTransform(key) : key)
      const raw = storage.getItem(storageKey)

      currentRaws[key] = raw

      if (hasCache && cachedRaws.get(key) !== raw) {
        hasCache = false
      }
    }

    if (hasCache) {
      return cachedOutput!
    }

    const output = { ...options.defaultValues }

    for (const key of keys) {
      const raw = currentRaws[key]

      if (raw === null) {
        output[key] = options.defaultValues[key]
      }
      else {
        output[key] = validateSchema(options.schemas[key], raw, {
          defaultValue: options.defaultValues[key],
          label: `createWebStorage:${String(key)}`,
          onError: options.onValidationError
            ? (issues, parsed) => options.onValidationError!({ issues: [...issues], key, value: parsed, defaultValue: options.defaultValues[key] })
            : undefined,
        })
      }

      cachedRaws.set(String(key), currentRaws[String(key)])
    }

    cachedOutput = output
    return output
  }

  const readable = createReadableSubscription(get, subscribe, notify)

  return {
    ...readable,
    'set': (value) => {
      if (typeof window === 'undefined') {
        return
      }

      const resolvedValue = typeof value === 'function' ? value(get()) : value

      const storage = window[options.type]

      Object.entries(resolvedValue).forEach(([key, value]) => {
        const storageValue = typeof value === 'string' ? value : JSON.stringify(value)

        storage.setItem(
          options.keyTransform ? options.keyTransform(key) : key,
          storageValue,
        )
        window.dispatchEvent(new StorageEvent('storage', {
          key: options.keyTransform ? options.keyTransform(key) : key,
          newValue: storageValue,
        }))
      })
      cachedOutput = undefined
    },
    '~': {
      ...readable['~'],
      getDefaultValue: key => defaultValues[key],
      type: options.type,
    },
  }
}
