import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Simplify } from '../utils'
import type { Readable, Subscribable, Writable } from './index'
import { createSubscription } from '.'
import { tryParseJson } from '../utils'

export type StoreSchema = Record<string, StandardSchemaV1<unknown, unknown>>

export type StoreOutput<S extends StoreSchema> = Simplify<{ [K in keyof S]: StandardSchemaV1.InferOutput<S[K]> }>

export interface Store<O extends Record<string, unknown>> extends Subscribable<O>, Readable<O>, Writable<O> {
  getDefaultValue: <K extends keyof O>(key: K) => O[K]
}

export interface StoreOptions<S extends Record<string, StandardSchemaV1>> {
  /**
   * Schemas for each storage key (one validator per key).
   * Use this when each key has its own type; for a single compound schema use a wrapper with one key.
   *
   * @example
   * ```ts
   * const store = createStore({
   *   schemas: {
   *     token: z.string().nullable(),
   *     preferences: z.object({ theme: z.enum(['light', 'dark']) }),
   *   },
   *   defaultValues: { token: null, preferences: { theme: 'light' } },
   *   provider: {
   *     get: () => ({
   *       token: window.localStorage.getItem('token'),
   *       preferences: window.localStorage.getItem('preferences'),
   *     }),
   *     set: (value) => {
   *       window.localStorage.setItem('token', value.token ?? '')
   *       window.localStorage.setItem('preferences', JSON.stringify(value.preferences))
   *     },
   *   },
   * })
   * ```
   */
  schemas: S
  /**
   * The default values to use for the storage.
   *
   * @example
   * ```ts
   * const store = createStore({
   *   schemas: {
   *     token: z.string().nullable(),
   *     preferences: z.object({ theme: z.enum(['light', 'dark']) }),
   *   },
   *   defaultValues: {
   *     token: null,
   *     preferences: { theme: 'light' },
   *   },
   *   provider: {
   *     get: () => ({
   *       token: window.localStorage.getItem('token'),
   *       preferences: window.localStorage.getItem('preferences'),
   *     }),
   *     set: (value) => {
   *       window.localStorage.setItem('token', value.token ?? '')
   *       window.localStorage.setItem('preferences', JSON.stringify(value.preferences))
   *     },
   *   },
   * })
   * ```
   */
  defaultValues: StoreOutput<S>
  provider: {
    get: () => StoreOutput<S>
    set: (value: StoreOutput<S>) => void
  }
}

/**
 * Creates a reactive handle for a storage instance.
 *
 * @example
 * ```ts twoslash
 * import { createStore } from 'seitu'
 * import * as z from 'zod'
 *
 * const store = createStore({
 *   schemas: {
 *     token: z.string().nullable(),
 *     preferences: z.object({ theme: z.enum(['light', 'dark']) }),
 *   },
 *   defaultValues: { token: null, preferences: { theme: 'light' } },
 *   provider: {
 *     get: () => ({
 *       token: window.localStorage.getItem('token'),
 *       preferences: JSON.parse(window.localStorage.getItem('preferences') ?? '{"theme":"light"}'),
 *     }),
 *     set: (value) => {
 *       window.localStorage.setItem('token', value.token ?? '')
 *       window.localStorage.setItem('preferences', JSON.stringify(value.preferences))
 *     },
 *   },
 * })
 *
 * store.get().token // null
 * store.get().preferences // { theme: 'light' }
 * store.set({ token: '123', preferences: { theme: 'dark' } })
 * store.get().token // '123'
 * store.get().preferences // { theme: 'dark' }
 * store.subscribe(value => console.log(value))
 * store.set({ token: '456', preferences: { theme: 'light' } })
 * // { token: '456', preferences: { theme: 'light' } }
 * ```
 */
export function createStore<S extends Record<string, StandardSchemaV1>>(options: StoreOptions<S>): Store<StoreOutput<S>> {
  const { subscribe, notify } = createSubscription()
  const defaultValues = { ...options.defaultValues }

  const get = () => {
    const output = { ...defaultValues }

    for (const [key, schema] of Object.entries(options.schemas) as [keyof S, StandardSchemaV1<unknown, unknown>][]) {
      const item = options.provider.get()[key]

      const result = schema['~standard'].validate(tryParseJson(item))

      if (result instanceof Promise) {
        throw new TypeError('[createStorage] Validation schema should not return a Promise.')
      }

      if (result.issues) {
        console.warn(JSON.stringify(result.issues, null, 2), { cause: result.issues })
      }

      output[key] = result.issues ? defaultValues[key] : result.value
    }

    return output
  }

  return {
    get,
    'set': (value) => {
      const newValue = typeof value === 'function' ? value(get()) : value
      options.provider.set(newValue)
      notify()
    },
    'getDefaultValue': key => defaultValues[key],
    'subscribe': (callback) => {
      return subscribe(() => {
        callback(get())
      })
    },
    '~': {
      output: null as unknown as StoreOutput<S>,
      notify,
    },
  }
}
