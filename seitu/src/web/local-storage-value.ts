import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { LocalStorage } from './local-storage'
import type {
  WebStorageValue as LocalStorageValue,
  WebStorageValueOptionsWithSchema as LocalStorageValueOptionsWithSchema,
  WebStorageValueOptionsWithStorage as LocalStorageValueOptionsWithStorage,
} from './web-storage-value'
import { createWebStorageValue } from './web-storage-value'

export type {
  LocalStorageValue,
  LocalStorageValueOptionsWithSchema,
  LocalStorageValueOptionsWithStorage,
}

/**
 * Creates a reactive handle for a single localStorage value.
 *
 * Two modes:
 * - **Schema mode** (`schema`, `key`, `defaultValue`): standalone key with validation. Missing or
 *   invalid stored data returns `defaultValue`.
 * - **Storage mode** (`storage`, `key`): binds to one key of a `createLocalStorage` instance.
 *   Type and default come from that storage.
 *
 * @example Vanilla
 * ```ts twoslash title="local-storage-value.ts"
 * import { createLocalStorageValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const value = createLocalStorageValue({
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
 * @example Storage mode
 * ```ts twoslash title="local-storage-value.ts"
 * import { createLocalStorage, createLocalStorageValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const storage = createLocalStorage({
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 * const count = createLocalStorageValue({ storage, key: 'count' })
 * count.set(5)
 * storage.get().count === 5 // true
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import { createLocalStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * export default function Page() {
 *   const count = useSubscription(() => createLocalStorageValue({
 *     key: 'count',
 *     defaultValue: 0,
 *     schema: z.number(),
 *   }))
 *
 *   return (
 *     <div>
 *       <span>{count}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function createLocalStorageValue<
  Storage extends LocalStorage<any>,
  K extends keyof Storage['~']['output'],
>(options: LocalStorageValueOptionsWithStorage<Storage, K>): LocalStorageValue<Storage['~']['output'][K]>
export function createLocalStorageValue<S extends StandardSchemaV1<unknown>>(
  options: LocalStorageValueOptionsWithSchema<S>,
): LocalStorageValue<StandardSchemaV1.InferOutput<S>>
export function createLocalStorageValue(
  options:
    | LocalStorageValueOptionsWithStorage<LocalStorage<any>, string>
    | LocalStorageValueOptionsWithSchema<StandardSchemaV1<unknown>>,
): LocalStorageValue<unknown> {
  if ('storage' in options) {
    return createWebStorageValue(options)
  }
  return createWebStorageValue({ ...options, kind: 'localStorage' })
}
