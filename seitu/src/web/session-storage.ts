import type { SchemaStoreOutput, SchemaStoreSchema } from '../core/index'
import type { WebStorage, WebStorageOptions } from './web-storage'
import { createWebStorage } from './web-storage'

export interface SessionStorage<O extends Record<string, unknown>> extends WebStorage<O> {}

export interface SessionStorageOptions<S extends SchemaStoreSchema> extends Omit<WebStorageOptions<S>, 'kind'> {}

/**
 * Creates a reactive handle for a sessionStorage instance.
 *
 * @example Vanilla
 * ```ts twoslash title="session-storage.ts"
 * import { createSessionStorage } from 'seitu/web'
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
 * import { createSessionStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = createSessionStorage({
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * export default function Page() {
 *   const { value } = useSubscription(sessionStorage)
 *   return (
 *     <div>
 *       <span>{value.count}</span>
 *       <span>{value.name}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function createSessionStorage<S extends SchemaStoreSchema>(options: SessionStorageOptions<S>): SessionStorage<SchemaStoreOutput<S>> {
  return createWebStorage<S>({
    kind: 'sessionStorage',
    ...options,
  })
}
