import type { StandardSchemaV1 } from '@standard-schema/spec'

import type {
  Clearable,
  ServerReadable,
  Subscribable,
  Writable,
} from '../../core'
import { createReadableSubscription, createSubscription } from '../../core'
import {
  dispatchStorageEvent,
  listenStorage,
} from '../../internal/storage-event'
import type { ValidationSchemaObjectErrorProps } from '../../internal/validate'
import { validateSchema } from '../../internal/validate'
import { tryParseJson } from '../../utils/json'
import type { Simplify } from '../../utils/types'

export type WebStorageInput = Record<string, StandardSchemaV1<unknown, unknown>>
export type WebStorageOutput<S extends WebStorageInput> = Simplify<{
  [K in keyof S]: StandardSchemaV1.InferOutput<S[K]>
}>

export interface WebStorageOptions<S extends WebStorageInput> {
  schemas: S
  defaultValues: WebStorageOutput<S>
  type: 'localStorage' | 'sessionStorage'
  keyTransform?: (key: keyof S) => string
  onValidationError?: (
    props: ValidationSchemaObjectErrorProps<WebStorageOutput<S>>
  ) => void | StandardSchemaV1.InferOutput<S[keyof S]>
}

export interface WebStorage<O extends Record<string, unknown>>
  extends
    Subscribable<O>,
    ServerReadable<O>,
    Writable<Partial<O>, O>,
    Clearable {
  '~': {
    getDefaultValue: <K extends keyof O>(key: K) => O[K]
    getSchema: (key: keyof O) => StandardSchemaV1<unknown>
    transformKey: (key: keyof O) => string
    type: 'localStorage' | 'sessionStorage'
  } & Subscribable<O>['~']
}

/**
 * Reactive handle for `localStorage` or `sessionStorage`. On the server, `get()`
 * and the SSR snapshot are `defaultValues`.
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
 * sessionStorage.get()
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
  options: WebStorageOptions<S>
): WebStorage<WebStorageOutput<S>> {
  const defaultValues = { ...options.defaultValues }
  const keys = Object.keys(defaultValues) as (keyof WebStorageOutput<S>)[]
  const resolveKey = (key: keyof WebStorageOutput<S>): string =>
    String(options.keyTransform ? options.keyTransform(key as keyof S) : key)
  const storageKeys = new Set(keys.map(resolveKey))

  // Ignore this handle's own synthetic events; notify once after the write.
  let isWriting = false

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe: () =>
      listenStorage(
        (event) =>
          !isWriting && (event.key === null || storageKeys.has(event.key)),
        notify
      ),
  })

  const cachedRaws = new Map<keyof WebStorageOutput<S>, string | null>()
  let cachedOutput: WebStorageOutput<S> | undefined

  const get = () => {
    if (typeof window === 'undefined') {
      return defaultValues
    }

    const storage = window[options.type]

    let hasCache = cachedOutput !== undefined
    const currentRaws = {} as Record<keyof WebStorageOutput<S>, string | null>

    for (const key of keys) {
      const raw = storage.getItem(resolveKey(key))

      currentRaws[key] = raw

      if (hasCache && cachedRaws.get(key) !== raw) {
        hasCache = false
      }
    }

    if (hasCache) {
      return cachedOutput!
    }

    const output = { ...defaultValues }

    for (const key of keys) {
      const raw = currentRaws[key]

      if (raw === null) {
        output[key] = defaultValues[key]
      } else {
        output[key] = validateSchema(options.schemas[key], tryParseJson(raw), {
          defaultValue: defaultValues[key],
          label: `createWebStorage:${String(key)}`,
          key,
          onError: options.onValidationError,
        })
      }

      cachedRaws.set(key, raw)
    }

    cachedOutput = output
    return output
  }

  const readable = createReadableSubscription(
    get,
    subscribe,
    notify,
    () => defaultValues
  )

  const write = (mutate: (storage: Storage) => void) => {
    if (typeof window === 'undefined') {
      return
    }

    isWriting = true
    try {
      mutate(window[options.type])
    } finally {
      isWriting = false
    }
    cachedOutput = undefined
    notify()
  }

  return {
    ...readable,
    set: (value) => {
      write((storage) => {
        const resolvedValue = typeof value === 'function' ? value(get()) : value

        for (const [key, entry] of Object.entries(resolvedValue)) {
          const storageKey = resolveKey(key)
          const oldValue = storage.getItem(storageKey)
          const newValue = JSON.stringify(entry)

          storage.setItem(storageKey, newValue)
          dispatchStorageEvent(storage, storageKey, oldValue, newValue)
        }
      })
    },
    clear: () => {
      write((storage) => {
        for (const key of keys) {
          const storageKey = resolveKey(key)
          const oldValue = storage.getItem(storageKey)

          storage.removeItem(storageKey)
          dispatchStorageEvent(storage, storageKey, oldValue, null)
        }
      })
    },
    '~': {
      ...readable['~'],
      getDefaultValue: (key) => defaultValues[key],
      getSchema: (key) => options.schemas[key as keyof S],
      transformKey: resolveKey,
      type: options.type,
    },
  }
}
