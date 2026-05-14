import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Clearable, Readable, Subscribable, Writable } from '../core/index'
import type { ValidationSchemaErrorProps, ValidationSchemaObjectErrorProps } from '../validate'
import type { WebStorage } from './web-storage'
import { createReadableSubscription, createSubscription } from '../core'
import { tryParseJson } from '../utils'
import { repairValueObjectWithDefault } from '../utils/validation'
import { validateSchema } from '../validate'

export interface WebStorageValue<V> extends Subscribable<V>, Readable<V>, Writable<V>, Clearable {}

export interface WebStorageValueOptionsWithStorage<
  Storage extends WebStorage<any>,
  K extends keyof Storage['~']['output'],
> {
  storage: Storage
  key: K
  onValidationError?: (props: ValidationSchemaObjectErrorProps<Storage['~']['output']>) => void
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

/**
 * Creates a reactive handle for a localStorage or sessionStorage instance.
 *
 * @example Vanilla
 * ```ts twoslash title="session-storage.ts"
 * import { createWebStorageValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const tokenStorage = createWebStorageValue({
 *   type: 'sessionStorage',
 *   key: 'token',
 *   schema: z.string().nullable(),
 *   defaultValue: null,
 * })
 *
 * tokenStorage.get() // null
 * tokenStorage.set('abc')
 * tokenStorage.get() // 'abc'
 * tokenStorage.subscribe(console.log)
 * ```
 *
 * @example With storage
 * ```ts twoslash title="session-storage.ts"
 * import { createWebStorage, createWebStorageValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * const countStorage = createWebStorageValue({
 *   storage: sessionStorage,
 *   key: 'count',
 * })
 *
 * countStorage.get() // 0
 * countStorage.set(1)
 * countStorage.get() // 1
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import { createWebStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const countStorage = createWebStorageValue({
 *   type: 'sessionStorage',
 *   key: 'count',
 *   schema: z.number(),
 *   defaultValue: 0,
 * })
 *
 * export default function Page() {
 *   const value = useSubscription(countStorage)
 *   return (
 *     <div>
 *       <span>{value}</span>
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
  const defaultValue = ('schema' in options ? options.defaultValue : options.storage['~'].getDefaultValue(options.key)) ?? null
  const isDefaultValueObject = typeof defaultValue === 'object' && defaultValue !== null

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe: () => {
      const listener = (event: StorageEvent) => {
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

  let cachedRaw: string | null | undefined
  let cachedValue: unknown

  const get = () => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    const storage = window[type]
    const raw = storage.getItem(options.key)

    if (cachedRaw !== undefined && raw === cachedRaw) {
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
        cachedValue = validateSchema(options.schema, parsed, {
          defaultValue,
          label: `createWebStorageValue:${options.key}`,
          onError: options.onValidationError
            ? (issues, parsed) => {
                const toReturn = options.onValidationError!({ defaultValue, issues: [...issues], value: parsed })

                if (toReturn === undefined && isDefaultValueObject) {
                  return repairValueObjectWithDefault({ defaultValue, issues: [...issues], value: parsed })
                }

                return toReturn
              }
            : (issues, parsed) => {
                if (isDefaultValueObject) {
                  return repairValueObjectWithDefault({ defaultValue, issues: [...issues], value: parsed })
                }

                return undefined
              },
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
      const storageValue = typeof newValue === 'string' ? newValue : JSON.stringify(newValue)
      storage.setItem(options.key, storageValue)
      window.dispatchEvent(new StorageEvent('storage', { key: options.key, newValue: storageValue }))
      cachedRaw = undefined
    },
    clear: () => {
      if (typeof window === 'undefined') {
        return
      }

      window[type].removeItem(options.key)
      cachedRaw = undefined
    },
  }
}
