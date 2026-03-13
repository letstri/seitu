import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Simplify } from '../utils'
import type { Readable, Subscribable, Writable } from './index'
import { createSubscription } from '.'
import { tryParseJson } from '../utils'

export interface SchemaStoreProvider<S extends SchemaStoreSchema> {
  get: () => SchemaStoreOutput<S>
  set: (value: Partial<SchemaStoreOutput<S>>) => void
}

export function createSchemaStoreMemoryProvider<S extends SchemaStoreSchema>(): SchemaStoreProvider<S> {
  const state = new Map<string, unknown>()
  return {
    get: () => Object.fromEntries(state.entries()) as SchemaStoreOutput<S>,
    set: (value: Partial<SchemaStoreOutput<S>>) => {
      state.clear()
      for (const [key, v] of Object.entries(value)) {
        state.set(key, v as unknown)
      }
    },
  }
}

export type SchemaStoreSchema = Record<string, StandardSchemaV1<unknown, unknown>>

export type SchemaStoreOutput<S extends SchemaStoreSchema> = Simplify<{ [K in keyof S]: StandardSchemaV1.InferOutput<S[K]> }>

export interface SchemaStore<O extends Record<string, unknown>> extends Subscribable<O>, Readable<O>, Writable<Partial<O>, O> {
  getDefaultValue: <K extends keyof O>(key: K) => O[K]
}

export interface SchemaStoreOptions<S extends Record<string, StandardSchemaV1>> {
  schemas: S
  defaultValues: SchemaStoreOutput<S>
  provider: SchemaStoreProvider<S>
}

export function createSchemaStore<S extends Record<string, StandardSchemaV1>>(options: SchemaStoreOptions<S>): SchemaStore<SchemaStoreOutput<S>> {
  const { subscribe, notify } = createSubscription()
  const defaultValues = { ...options.defaultValues }

  const get = () => {
    const output = { ...defaultValues }

    for (const [key, schema] of Object.entries(options.schemas) as [keyof S, StandardSchemaV1<unknown, unknown>][]) {
      const item = options.provider.get()[key]

      const result = schema['~standard'].validate(tryParseJson(item))

      if (result instanceof Promise) {
        throw new TypeError('[createStorage] Validation schema should not return a Promise.')
      }

      if (result.issues) {
        console.warn(JSON.stringify(result.issues, null, 2), { cause: result.issues })
      }

      output[key] = result.issues ? defaultValues[key] : result.value
    }

    return output
  }

  return {
    get,
    'set': (value) => {
      const newValue = typeof value === 'function' ? value(get()) : value
      options.provider.set(newValue)
      notify()
    },
    'getDefaultValue': key => defaultValues[key],
    'subscribe': (callback) => {
      return subscribe(() => {
        callback(get())
      })
    },
    '~': {
      output: null as unknown as SchemaStoreOutput<S>,
      notify,
    },
  }
}
