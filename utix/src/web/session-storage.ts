import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Readable, Subscribable, Writable } from '../core/index'
import type { Simplify } from '../utils'
import { createSubscription } from '../core'
import { tryParseJson } from '../utils'

type Output<S extends Record<string, StandardSchemaV1>> = Simplify<{ [K in keyof S]: StandardSchemaV1.InferOutput<S[K]> }>

export interface SessionStorage<O extends Record<string, unknown>> extends Subscribable<O>, Readable<O>, Writable<Partial<O>, O> {
  clear: () => void
  defaultValues: Readonly<O>
}

export interface SessionStorageOptions<S extends Record<string, StandardSchemaV1>> {
  /**
   * Schemas for each session storage key (one validator per key).
   * Use this when each key has its own type; for a single compound schema use a wrapper with one key.
   *
   * @example
   * ```ts
   * const sessionStorage = createSessionStorage({
   *   schemas: {
   *     token: z.string().nullable(),
   *     preferences: z.object({ theme: z.enum(['light', 'dark']) }),
   *   },
   *   defaultValues: { token: null, preferences: { theme: 'light' } },
   * })
   * ```
   */
  schemas: S
  /**
   * The default values to use for the session storage.
   *
   * @example
   * ```ts
   * const sessionStorage = createSessionStorage({
   *   defaultValues: {
   *     token: null,
   *     preferences: { theme: 'light' },
   *   },
   * })
   * ```
   */
  defaultValues: Output<S>
}

/**
 * Creates a reactive handle for a sessionStorage instance.
 *
 * @example
 * ```ts twoslash
 * import { createSessionStorage } from 'utix/web'
 * import * as z from 'zod'
 *
 * const sessionStorage = createSessionStorage({
 *   schemas: {
 *     token: z.string().nullable(),
 *     preferences: z.object({ theme: z.enum(['light', 'dark']) }),
 *   },
 *   defaultValues: { token: null, preferences: { theme: 'light' } },
 * })
 *
 * sessionStorage.get().token // null
 * sessionStorage.get().preferences // { theme: 'light' }
 * sessionStorage.set({ token: '123', preferences: { theme: 'dark' } })
 * sessionStorage.get().token // '123'
 * sessionStorage.get().preferences // { theme: 'dark' }
 * sessionStorage.clear()
 * sessionStorage.get().token // null
 * sessionStorage.get().preferences // { theme: 'light' }
 * sessionStorage.subscribe(value => console.log(value))
 * sessionStorage.set({ token: '456', preferences: { theme: 'light' } })
 * // { token: '456', preferences: { theme: 'light' } }
 * sessionStorage.clear()
 * // { token: null, preferences: { theme: 'light' } }
 * ```
 */
export function createSessionStorage<S extends Record<string, StandardSchemaV1>>(options: SessionStorageOptions<S>): SessionStorage<Output<S>> {
  const { subscribe, notify } = createSubscription<Output<S>>()
  const defaultValues = { ...options.defaultValues }

  const get = () => {
    const output = { ...defaultValues }

    for (const [key, schema] of Object.entries(options.schemas) as [keyof S, StandardSchemaV1<unknown, unknown>][]) {
      if (typeof window === 'undefined') {
        return defaultValues
      }

      const item = window.sessionStorage.getItem(key as string)

      if (item === null)
        continue

      const result = schema['~standard'].validate(tryParseJson(item))

      if (result instanceof Promise) {
        throw new TypeError('[createSessionStorage] Validation schema should not return a Promise.')
      }

      output[key] = result.issues ? defaultValues[key] : result.value
    }

    return output
  }

  return {
    get,
    'set': (value) => {
      const newValue = typeof value === 'function' ? value(get()) : value
      for (const [key, v] of Object.entries(newValue as Record<string, unknown>)) {
        window.sessionStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v))
      }
      notify({ ...get(), ...newValue })
    },
    'subscribe': (callback) => {
      const unsubscribe = subscribe(() => {
        const value = get()
        callback(value)
      })

      return () => {
        unsubscribe()
      }
    },
    'clear': () => {
      window.sessionStorage.clear()
      notify({ ...options.defaultValues })
    },
    defaultValues,
    '~types': {
      output: null as unknown as Output<S>,
    },
  }
}
