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
import type { ValidationSchemaErrorProps } from '../../internal/validate'
import { validateSchema } from '../../internal/validate'
import { tryParseJson } from '../../utils/json'
import { repairValueObjectWithDefault } from '../../utils/validation'

export interface WebStorageValue<V>
  extends Subscribable<V>, ServerReadable<V>, Writable<V>, Clearable {}

export interface WebStorageValueOptions<S extends StandardSchemaV1<unknown>> {
  type: 'localStorage' | 'sessionStorage'
  schema: S
  key: string
  defaultValue: StandardSchemaV1.InferOutput<S>
  /** Return a repaired value, or nothing to fall back to `defaultValue`. */
  onValidationError?: (
    props: ValidationSchemaErrorProps<StandardSchemaV1.InferOutput<S>>
  ) => void | StandardSchemaV1.InferOutput<S>
}

/**
 * Reactive handle for one `localStorage`/`sessionStorage` key. On the server,
 * `get()` and the SSR snapshot are `defaultValue`.
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
export function createWebStorageValue<S extends StandardSchemaV1<unknown>>(
  options: WebStorageValueOptions<S>
): WebStorageValue<StandardSchemaV1.InferOutput<S>>
export function createWebStorageValue(
  options: WebStorageValueOptions<StandardSchemaV1<unknown>>
): WebStorageValue<unknown> {
  const { type, schema, key: storageKey } = options
  const defaultValue = options.defaultValue ?? null
  const isDefaultValueObject =
    typeof defaultValue === 'object' && defaultValue !== null
  const label = `createWebStorageValue:${storageKey}`

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe: () =>
      listenStorage(
        // `null` key means `storage.clear()`.
        (event) => event.key === null || event.key === storageKey,
        notify
      ),
  })

  let cachedRaw: string | null | undefined
  let cachedValue: unknown

  const get = () => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    const storage = window[type]
    const raw = storage.getItem(storageKey)

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
      cachedValue = validateSchema(schema, parsed, {
        defaultValue,
        label,
        key: options.key,
        onError: (props) => {
          const toReturn = options.onValidationError?.(props)

          return toReturn === undefined && isDefaultValueObject
            ? repairValueObjectWithDefault(props as never)
            : toReturn
        },
      })
    } catch (error) {
      console.warn(
        `[${label}] Validation failed, returned default value instead`,
        error
      )
      cachedValue = defaultValue
    }

    return cachedValue
  }

  const readable = createReadableSubscription(
    get,
    subscribe,
    notify,
    () => defaultValue
  )

  // Returns the raw value written, or `null` when the key was removed.
  const write = (mutate: (storage: Storage) => string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const storage = window[type]
    const oldRaw = storage.getItem(storageKey)
    const newRaw = mutate(storage)

    cachedRaw = undefined
    dispatchStorageEvent(storage, storageKey, oldRaw, newRaw)
  }

  return {
    ...readable,
    set: (value) =>
      write((storage) => {
        const newRaw = JSON.stringify(
          typeof value === 'function' ? value(get()) : value
        )
        storage.setItem(storageKey, newRaw)
        return newRaw
      }),
    clear: () =>
      write((storage) => {
        storage.removeItem(storageKey)
        return null
      }),
  }
}
