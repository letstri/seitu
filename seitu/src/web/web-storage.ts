import type { SchemaStore, SchemaStoreOptions, SchemaStoreOutput, SchemaStoreSchema } from '../core/index'
import { createSchemaStore } from '../core/index'
import { tryParseJson } from '../utils'

export interface WebStorageOptions<S extends SchemaStoreSchema> extends Omit<SchemaStoreOptions<S>, 'provider'> {
  keyTransform?: (key: keyof S) => string
  /**
   * If true, the stored value will be cleared if the validation fails.
   *
   * @default true
   */
  clearOnValidationFailure?: boolean
}

export interface WebStorage<O extends Record<string, unknown>> extends SchemaStore<O> {
  '~': {
    kind: 'sessionStorage' | 'localStorage'
  } & SchemaStore<O>['~']
}

export function createWebStorage<S extends SchemaStoreSchema>(
  options: WebStorageOptions<S> & { kind: 'sessionStorage' | 'localStorage' },
): WebStorage<SchemaStoreOutput<S>> {
  const { kind, keyTransform, defaultValues, schemas, clearOnValidationFailure } = options
  let isInternalUpdate = false

  const store = createSchemaStore<S>({
    defaultValues,
    schemas,
    provider: {
      get: () => {
        if (typeof window === 'undefined') {
          return defaultValues
        }

        const storage = window[kind]
        const output = { ...defaultValues }

        for (const key in output) {
          const item = storage.getItem(keyTransform ? keyTransform(key) : key)

          if (item === null) {
            output[key] = defaultValues[key]
            continue
          }

          const parsed = tryParseJson(item)
          const result = schemas[key]['~standard'].validate(parsed)

          if (result instanceof Promise) {
            throw new TypeError('[createWebSchemaStore] Validation schema should not return a Promise.')
          }

          if (result.issues) {
            if (clearOnValidationFailure) {
              storage.removeItem(keyTransform ? keyTransform(key) : key)
            }
            else {
              console.warn(JSON.stringify(result.issues, null, 2), { cause: result.issues })
            }
          }

          output[key] = result.issues ? defaultValues[key] : result.value
        }

        return output
      },
      set: (value) => {
        if (typeof window === 'undefined') {
          return
        }

        const storage = window[kind]

        isInternalUpdate = true
        Object.entries(value).forEach(([key, entryValue]) => {
          const newValue = typeof entryValue === 'string' ? entryValue : JSON.stringify(entryValue)

          storage.setItem(
            keyTransform ? keyTransform(key) : key,
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
      kind,
      ...store['~'],
    },
  }
}
