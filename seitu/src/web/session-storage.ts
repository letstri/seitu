import type { SchemaStore, SchemaStoreOptions, SchemaStoreOutput, SchemaStoreSchema } from '../core/index'
import { createSchemaStore } from '../core/index'
import { tryParseJson } from '../utils'

export type SessionStorage<O extends Record<string, unknown>> = SchemaStore<O>

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
 *   const { value: storage } = useSubscription(sessionStorage)
 *   return (
 *     <div>
 *       <span>{storage.count}</span>
 *       <span>{storage.name}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function createSessionStorage<S extends SchemaStoreSchema>(options: Omit<SchemaStoreOptions<S>, 'provider'>): SessionStorage<SchemaStoreOutput<S>> {
  const store = createSchemaStore<S>({
    ...options,
    provider: {
      get: () => {
        if (typeof window === 'undefined') {
          return options.defaultValues
        }

        const output = { ...options.defaultValues }

        for (const key in output) {
          const item = tryParseJson(window.sessionStorage.getItem(key))
          const result = options.schemas[key]['~standard'].validate(item)

          if (result instanceof Promise) {
            throw new TypeError('[createSessionStorage] Validation schema should not return a Promise.')
          }

          if (result.issues) {
            console.warn(JSON.stringify(result.issues, null, 2), { cause: result.issues })
          }

          output[key] = result.issues ? options.defaultValues[key] : result.value
        }

        return output
      },
      set: (value) => {
        if (typeof window === 'undefined') {
          return
        }

        Object.entries(value).forEach(([key, value]) => {
          window.sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        })
      },
    },
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', () => {
      store['~'].notify()
    })
  }

  return store
}
