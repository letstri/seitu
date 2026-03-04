import type { Store, StoreOptions, StoreOutput, StoreSchema } from '../core/index'
import { createStore } from '../core/index'
import { tryParseJson } from '../utils'

export type SessionStorage<O extends Record<string, unknown>> = Store<O>

/**
 * Creates a reactive handle for a sessionStorage instance.
 *
 * @example
 * ```ts twoslash
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
 * sessionStorage.get().token // null
 * sessionStorage.get().preferences // { theme: 'light' }
 * sessionStorage.set({ token: '123', preferences: { theme: 'dark' } })
 * sessionStorage.get().token // '123'
 * sessionStorage.get().preferences // { theme: 'dark' }
 * sessionStorage.subscribe(value => console.log(value))
 * sessionStorage.set({ token: '456', preferences: { theme: 'light' } })
 * // { token: '456', preferences: { theme: 'light' } }
 * ```
 */
export function createSessionStorage<S extends StoreSchema>(options: Omit<StoreOptions<S>, 'provider'>): SessionStorage<StoreOutput<S>> {
  const store = createStore<S>({
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
