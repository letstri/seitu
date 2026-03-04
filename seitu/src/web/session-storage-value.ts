import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Readable, Subscribable, Writable } from '../core/index'
import type { SessionStorage } from './session-storage'
import { createSubscription } from '../core'
import { tryParseJson } from '../utils'

export interface SessionStorageValue<V> extends Subscribable<V>, Readable<V>, Writable<V> {}

export interface SessionStorageValueOptionsWithStorage<
  Storage extends SessionStorage<any>,
  K extends keyof Storage['~']['output'],
> {
  storage: Storage
  key: K
}

export interface SessionStorageValueOptionsWithSchema<
  S extends StandardSchemaV1<unknown>,
> {
  schema: S
  key: string
  defaultValue: StandardSchemaV1.InferOutput<S>
}

export type SessionStorageValueOptions
  = | SessionStorageValueOptionsWithStorage<SessionStorage<any>, string>
    | SessionStorageValueOptionsWithSchema<StandardSchemaV1<unknown>>

/**
 * Creates a reactive handle for a single sessionStorage value.
 *
 * Two modes:
 * - **Schema mode** (`schema`, `key`, `defaultValue`): standalone key with validation. Missing or
 *   invalid stored data returns `defaultValue`.
 * - **Storage mode** (`storage`, `key`): binds to one key of a `createSessionStorage` instance.
 *   Type and default come from that storage.
 *
 * @example
 * ```ts twoslash
 * import { sessionStorageValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const value = sessionStorageValue({
 *   key: 'count',
 *   defaultValue: 0,
 *   schema: z.number(),
 * })
 * value.get() // 0
 * value.set(1)
 * value.set(v => v + 1)
 * value.subscribe(v => console.log(v))
 * ```
 *
 * @example
 * ```ts twoslash
 * import { createSessionStorage, sessionStorageValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const storage = createSessionStorage({
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 * const count = sessionStorageValue({ storage, key: 'count' })
 * count.set(5)
 * storage.get().count === 5 // true
 * ```
 */
export function sessionStorageValue<
  Storage extends SessionStorage<any>,
  K extends keyof Storage['~']['output'],
>(options: SessionStorageValueOptionsWithStorage<Storage, K>): SessionStorageValue<Storage['~']['output'][K]>
export function sessionStorageValue<S extends StandardSchemaV1<unknown>>(
  options: SessionStorageValueOptionsWithSchema<S>,
): SessionStorageValue<StandardSchemaV1.InferOutput<S>>
export function sessionStorageValue(
  options: SessionStorageValueOptions,
): SessionStorageValue<unknown> {
  if ('schema' in options && options.defaultValue === undefined) {
    throw new Error('[sessionStorageValue] Default value is required')
  }

  if (options.key === undefined) {
    throw new Error('[sessionStorageValue] Key is required')
  }

  if (!('schema' in options || 'storage' in options)) {
    throw new Error('[sessionStorageValue] Either schema or storage must be provided')
  }

  const defaultValue = ('schema' in options ? options.defaultValue : options.storage.getDefaultValue(options.key)) ?? null

  const { subscribe, notify } = createSubscription()

  const get = () => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    const item = window.sessionStorage.getItem(options.key)

    if (item === null) {
      return defaultValue
    }

    const parsed = tryParseJson(item)

    try {
      if ('schema' in options) {
        const result = options.schema['~standard'].validate(parsed)

        if (result instanceof Promise) {
          throw new TypeError('Validation schema should not return a Promise.')
        }

        if (result.issues) {
          console.error(JSON.stringify(result.issues, null, 2), { cause: result.issues })
          return defaultValue
        }
        return result.value
      }
      else {
        return parsed
      }
    }
    catch {
      return (defaultValue !== undefined && typeof defaultValue !== 'string' ? defaultValue : parsed)
    }
  }

  return {
    get,
    'set': (value) => {
      if (typeof window === 'undefined') {
        return
      }

      const newValue = typeof value === 'function' ? value(get()) : value
      window.sessionStorage.setItem(options.key, typeof newValue === 'string' ? newValue : JSON.stringify(newValue))
      window.dispatchEvent(new Event('storage'))
      notify()
    },
    'subscribe': (callback) => {
      const unsubscribe = subscribe(() => callback(get()))
      const onStorage = (event: StorageEvent): void => {
        if (event.key === options.key) {
          callback(get())
        }
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', onStorage)
      }
      return () => {
        unsubscribe()
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', onStorage)
        }
      }
    },
    '~': {
      output: null as unknown as typeof defaultValue,
      notify,
    },
  }
}
