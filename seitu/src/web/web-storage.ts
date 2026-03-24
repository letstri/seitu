import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { SchemaStore, SchemaStoreOptions, SchemaStoreOutput, SchemaStoreSchema } from '../core/index'
import { createSchemaStore } from '../core/index'
import { tryParseJson } from '../utils'

export interface WebStorageOptions<S extends SchemaStoreSchema> extends Omit<SchemaStoreOptions<S>, 'provider'> {
  keyTransform?: (key: keyof S) => string
  onValidationError?: <K extends keyof S>(props: { issues: StandardSchemaV1.Issue[], key: K, value: unknown }) => void | StandardSchemaV1.InferOutput<S[K]>
}

export interface WebStorage<O extends Record<string, unknown>> extends SchemaStore<O> {
  '~': {
    kind: 'sessionStorage' | 'localStorage'
  } & SchemaStore<O>['~']
}

export function createWebStorage<S extends SchemaStoreSchema>(
  options: WebStorageOptions<S> & { kind: 'sessionStorage' | 'localStorage' },
): WebStorage<SchemaStoreOutput<S>> {
  let isInternalUpdate = false

  const store = createSchemaStore<S>({
    defaultValues: options.defaultValues,
    schemas: options.schemas,
    provider: {
      get: () => {
        if (typeof window === 'undefined') {
          return options.defaultValues
        }

        const storage = window[options.kind]
        const output = { ...options.defaultValues }

        for (const key in output) {
          const item = storage.getItem(options.keyTransform ? options.keyTransform(key) : key)

          if (item === null) {
            output[key] = options.defaultValues[key]
            continue
          }

          const parsed = tryParseJson(item)
          const result = options.schemas[key]['~standard'].validate(parsed)

          if (result instanceof Promise) {
            throw new TypeError('[createWebSchemaStore] Validation schema should not return a Promise.')
          }

          if (result.issues) {
            if (options.onValidationError) {
              const value = options.onValidationError({ issues: [...result.issues], key, value: parsed })

              if (value !== undefined) {
                const validated = options.schemas[key]['~standard'].validate(value)

                if (validated instanceof Promise) {
                  throw new TypeError('Validation schema should not return a Promise.')
                }

                if (validated.issues) {
                  console.error('Returned value invalid, returned default value instead', JSON.stringify(validated.issues, null, 2), { cause: validated.issues })
                }
                else {
                  output[key] = validated.value
                }
              }
            }
            else {
              console.warn(JSON.stringify(result.issues, null, 2), { cause: result.issues })
              output[key] = options.defaultValues[key]
            }
          }
          else {
            output[key] = result.value
          }
        }

        return output
      },
      set: (value) => {
        if (typeof window === 'undefined') {
          return
        }

        const storage = window[options.kind]

        isInternalUpdate = true
        Object.entries(value).forEach(([key, entryValue]) => {
          const newValue = typeof entryValue === 'string' ? entryValue : JSON.stringify(entryValue)

          storage.setItem(
            options.keyTransform ? options.keyTransform(key) : key,
            newValue,
          )
        })
        window.dispatchEvent(new Event('storage'))
        isInternalUpdate = false
      },
    },
  })

  const listener = () => {
    if (isInternalUpdate) {
      return
    }

    store['~'].notify()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', listener)
  }

  return {
    ...store,
    'destroy': () => {
      store.destroy?.()
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', listener)
      }
    },
    '~': {
      kind: options.kind,
      ...store['~'],
    },
  }
}
