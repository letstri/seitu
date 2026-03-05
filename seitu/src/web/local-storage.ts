import type { SchemaStoreOutput, SchemaStoreSchema } from '../core/index'
import type { WebStorage, WebStorageOptions } from './web-storage'
import { createWebStorage } from './web-storage'

export interface LocalStorage<O extends Record<string, unknown>> extends WebStorage<O> {}

export interface LocalStorageOptions<S extends SchemaStoreSchema> extends Omit<WebStorageOptions<S>, 'kind'> {}

/**
 * Creates a reactive handle for a localStorage instance.
 *
 * @example Vanilla
 * ```ts twoslash title="local-storage.ts"
 * import { createLocalStorage } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const localStorage = createLocalStorage({
 *   schemas: {
 *     token: z.string().nullable(),
 *     preferences: z.object({ theme: z.enum(['light', 'dark']) }),
 *   },
 *   defaultValues: { token: null, preferences: { theme: 'light' } },
 * })
 *
 * localStorage.get() // { token: null, preferences: { theme: 'light' } }
 * localStorage.set({ token: 'abc' })
 * localStorage.get() // { token: 'abc', preferences: { theme: 'light' } }
 * localStorage.subscribe(console.log)
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import { createLocalStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const localStorage = createLocalStorage({
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * export default function Page() {
 *   const { value } = useSubscription(localStorage)
 *   return (
 *     <div>
 *       <span>{value.count}</span>
 *       <span>{value.name}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function createLocalStorage<S extends SchemaStoreSchema>(options: LocalStorageOptions<S>): LocalStorage<SchemaStoreOutput<S>> {
  return createWebStorage<S>({
    kind: 'localStorage',
    ...options,
  })
}
