import type { SchemaStore, SchemaStoreOptions, SchemaStoreOutput, SchemaStoreSchema } from '../core/index'
import { createSchemaStore } from '../core/index'
import { tryParseJson } from '../utils'

export interface WebStorageOptions<S extends SchemaStoreSchema> extends Omit<SchemaStoreOptions<S>, 'provider'> {}

export interface WebStorage<O extends Record<string, unknown>> extends SchemaStore<O> {
  '~': {
    kind: 'sessionStorage' | 'localStorage'
  } & SchemaStore<O>['~']
}

export function createWebStorage<S extends SchemaStoreSchema>(
  options: WebStorageOptions<S> & { kind: 'sessionStorage' | 'localStorage' },
): WebStorage<SchemaStoreOutput<S>> {
  const { kind, ...rest } = options

  const store = createSchemaStore<S>({
    ...rest,
    provider: {
      get: () => {
        if (typeof window === 'undefined') {
          return rest.defaultValues
        }

        const storage = window[kind]
        const output = { ...rest.defaultValues }

        for (const key in output) {
          const item = tryParseJson(storage.getItem(key))
          const result = rest.schemas[key]['~standard'].validate(item)

          if (result instanceof Promise) {
            throw new TypeError('[createWebSchemaStore] Validation schema should not return a Promise.')
          }

          if (result.issues) {
            console.warn(JSON.stringify(result.issues, null, 2), { cause: result.issues })
          }

          output[key] = result.issues ? rest.defaultValues[key] : result.value
        }

        return output
      },
      set: (value) => {
        if (typeof window === 'undefined') {
          return
        }

        const storage = window[kind]

        Object.entries(value).forEach(([key, entryValue]) => {
          storage.setItem(key, typeof entryValue === 'string' ? entryValue : JSON.stringify(entryValue))
        })
      },
    },
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', () => {
      store['~'].notify()
    })
  }

  return {
    ...store,
    '~': {
      kind,
      ...store['~'],
    },
  }
}
