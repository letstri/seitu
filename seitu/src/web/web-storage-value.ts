import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Readable, Subscribable, Writable } from '../core/index'
import type { WebStorage } from './web-storage'
import { createSubscription } from '../core'
import { tryParseJson } from '../utils'

export interface WebStorageValue<V> extends Subscribable<V>, Readable<V>, Writable<V> {}

export interface WebStorageValueOptionsWithStorage<
  Storage extends WebStorage<any>,
  K extends keyof Storage['~']['output'],
> {
  storage: Storage
  key: K
}

export interface WebStorageValueOptionsWithSchema<
  S extends StandardSchemaV1<unknown>,
> {
  schema: S
  key: string
  defaultValue: StandardSchemaV1.InferOutput<S>
}

export function createWebStorageValue<
  Storage extends WebStorage<any>,
  K extends keyof Storage['~']['output'],
>(options: WebStorageValueOptionsWithStorage<Storage, K>): WebStorageValue<Storage['~']['output'][K]>
export function createWebStorageValue<S extends StandardSchemaV1<unknown>>(
  options: WebStorageValueOptionsWithSchema<S> & { kind: 'sessionStorage' | 'localStorage' },
): WebStorageValue<StandardSchemaV1.InferOutput<S>>
export function createWebStorageValue(
  options:
    | WebStorageValueOptionsWithStorage<WebStorage<any>, string>
    | WebStorageValueOptionsWithSchema<StandardSchemaV1<unknown>> & { kind: 'sessionStorage' | 'localStorage' },
): WebStorageValue<unknown> {
  const kind = 'storage' in options ? options.storage['~'].kind : options.kind
  const label = `${kind}Value`
  if ('schema' in options && options.defaultValue === undefined) {
    throw new Error(`[${label}] Default value is required`)
  }

  if (options.key === undefined) {
    throw new Error(`[${label}] Key is required`)
  }

  if (!('schema' in options || 'storage' in options)) {
    throw new Error(`[${label}] Either schema or storage must be provided`)
  }

  const defaultValue = ('schema' in options ? options.defaultValue : options.storage.getDefaultValue(options.key)) ?? null

  const { subscribe, notify } = createSubscription()

  const get = () => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    const storage = window[kind]
    const item = storage.getItem(options.key)

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

      const storage = window[kind]
      const newValue = typeof value === 'function' ? value(get()) : value
      storage.setItem(options.key, typeof newValue === 'string' ? newValue : JSON.stringify(newValue))
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
      output: null as unknown,
      notify,
    },
  }
}
