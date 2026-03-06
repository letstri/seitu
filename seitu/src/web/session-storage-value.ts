import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { SessionStorage } from './session-storage'
import type {
  WebStorageValue as SessionStorageValue,
  WebStorageValueOptionsWithSchema as SessionStorageValueOptionsWithSchema,
  WebStorageValueOptionsWithStorage as SessionStorageValueOptionsWithStorage,
} from './web-storage-value'
import { createWebStorageValue } from './web-storage-value'

export type {
  SessionStorageValue,
  SessionStorageValueOptionsWithSchema,
  SessionStorageValueOptionsWithStorage,
}

/**
 * Creates a reactive handle for a single sessionStorage value.
 *
 * Two modes:
 * - **Schema mode** (`schema`, `key`, `defaultValue`): standalone key with validation. Missing or
 *   invalid stored data returns `defaultValue`.
 * - **Storage mode** (`storage`, `key`): binds to one key of a `createSessionStorage` instance.
 *   Type and default come from that storage.
 *
 * @example Vanilla
 * ```ts twoslash title="session-storage-value.ts"
 * import { createSessionStorageValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const value = createSessionStorageValue({
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
 * ```ts twoslash title="session-storage-value.ts"
 * import { createSessionStorage, createSessionStorageValue } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const storage = createSessionStorage({
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 * const count = createSessionStorageValue({ storage, key: 'count' })
 * count.set(5)
 * storage.get().count === 5 // true
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import { createSessionStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * export default function Page() {
 *   const count = useSubscription(() => createSessionStorageValue({
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
export function createSessionStorageValue<
  Storage extends SessionStorage<any>,
  K extends keyof Storage['~']['output'],
>(options: SessionStorageValueOptionsWithStorage<Storage, K>): SessionStorageValue<Storage['~']['output'][K]>
export function createSessionStorageValue<S extends StandardSchemaV1<unknown>>(
  options: SessionStorageValueOptionsWithSchema<S>,
): SessionStorageValue<StandardSchemaV1.InferOutput<S>>
export function createSessionStorageValue(
  options:
    | SessionStorageValueOptionsWithStorage<SessionStorage<any>, string>
    | SessionStorageValueOptionsWithSchema<StandardSchemaV1<unknown>>,
): SessionStorageValue<unknown> {
  if ('storage' in options) {
    return createWebStorageValue(options)
  }
  return createWebStorageValue({ ...options, kind: 'sessionStorage' })
}
