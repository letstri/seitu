import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Readable, Removable, Subscribable, Writable } from '../core/index'
import type { ValidationSchemaErrorProps, ValidationSchemasErrorProps } from '../validate'
import type { WebStorage } from './web-storage'
import { createReadableSubscription, createSubscription } from '../core'
import { tryParseJson } from '../utils'
import { validateSchema } from '../validate'

export interface WebStorageValue<V> extends Subscribable<V>, Readable<V>, Writable<V>, Removable {}

export interface WebStorageValueOptionsWithStorage<
  Storage extends WebStorage<any>,
  K extends keyof Storage['~']['output'],
> {
  storage: Storage
  key: K
  onValidationError?: (props: ValidationSchemasErrorProps<Storage['~']['output']>) => void
}

export interface WebStorageValueOptionsWithSchema<
  S extends StandardSchemaV1<unknown>,
> {
  type: 'localStorage' | 'sessionStorage'
  schema: S
  key: string
  defaultValue: StandardSchemaV1.InferOutput<S>
  /**
   * Handle validation errors.
   *
   * If returns a value, it will be used as the value to validate and return.
   * If returns undefined, the default value will be returned.
   */
  onValidationError?: (props: ValidationSchemaErrorProps<StandardSchemaV1.InferOutput<S>>) => void | StandardSchemaV1.InferOutput<S>
}

const NO_CACHE = Symbol('no-cache')

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
export function createWebStorageValue<
  Storage extends WebStorage<any>,
  K extends keyof Storage['~']['output'],
>(options: WebStorageValueOptionsWithStorage<Storage, K>): WebStorageValue<Storage['~']['output'][K]>
export function createWebStorageValue<S extends StandardSchemaV1<unknown>>(
  options: WebStorageValueOptionsWithSchema<S>,
): WebStorageValue<StandardSchemaV1.InferOutput<S>>
export function createWebStorageValue(
  options:
    | WebStorageValueOptionsWithStorage<WebStorage<any>, string>
    | WebStorageValueOptionsWithSchema<StandardSchemaV1<unknown>>,
): WebStorageValue<unknown> {
  const type = 'storage' in options ? options.storage['~'].type : options.type
  let isInternalUpdate = false
  const defaultValue = ('schema' in options ? options.defaultValue : options.storage['~'].getDefaultValue(options.key)) ?? null

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe: () => {
      const listener = (event: StorageEvent) => {
        if (isInternalUpdate) {
          return
        }

        if (event.key === options.key) {
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

  let cachedRaw: string | null | typeof NO_CACHE = NO_CACHE
  let cachedValue: unknown

  const get = () => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    const storage = window[type]
    const raw = storage.getItem(options.key)

    if (cachedRaw !== NO_CACHE && raw === cachedRaw) {
      return cachedValue
    }

    cachedRaw = raw

    if (raw === null) {
      cachedValue = defaultValue
      return cachedValue
    }

    const parsed = tryParseJson(raw)

    try {
      if ('schema' in options) {
        cachedValue = validateSchema(options.schema, raw, {
          defaultValue,
          label: `createWebStorageValue:${options.key}`,
          onError: options.onValidationError
            ? (issues, parsed) => options.onValidationError!({ defaultValue, issues: [...issues], value: parsed })
            : undefined,
        })
        return cachedValue
      }
      else {
        cachedValue = parsed
        return cachedValue
      }
    }
    catch {
      cachedValue = (defaultValue !== undefined && typeof defaultValue !== 'string' ? defaultValue : parsed)
      return cachedValue
    }
  }

  const readable = createReadableSubscription(get, subscribe, notify)

  return {
    ...readable,
    set: (value) => {
      if (typeof window === 'undefined') {
        return
      }

      const storage = window[type]
      const newValue = typeof value === 'function' ? value(get()) : value
      isInternalUpdate = true
      storage.setItem(options.key, typeof newValue === 'string' ? newValue : JSON.stringify(newValue))
      window.dispatchEvent(new StorageEvent('storage', { key: options.key, newValue }))
      isInternalUpdate = false

      cachedRaw = NO_CACHE
      notify()
    },
    remove: () => {
      if (typeof window === 'undefined') {
        return
      }

      window[type].removeItem(options.key)
      cachedRaw = NO_CACHE
    },
  }
}
