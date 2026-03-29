import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Simplify } from '../utils'
import type { Readable, Subscribable, Writable } from './index'
import { createStore, createSubscription } from '.'
import { tryParseJson } from '../utils'

export type SchemaStoreSchema = Record<string, StandardSchemaV1<unknown, unknown>>

export type SchemaStoreOutput<S extends SchemaStoreSchema> = Simplify<{ [K in keyof S]: StandardSchemaV1.InferOutput<S[K]> }>

export interface SchemaStore<O extends Record<string, unknown>> extends Subscribable<O>, Readable<O>, Writable<Partial<O>, O> {
  getDefaultValue: <K extends keyof O>(key: K) => O[K]
}

export interface SchemaStoreOptions<S extends Record<string, StandardSchemaV1>> {
  schemas: S
  defaultValues: SchemaStoreOutput<S>
  /**
   * The provider to use for the schema store. If not provided, the schema store will
   * use an in-memory provider.
   */
  provider?: SchemaStoreProvider<S>
}

/**
 * Creates a reactive schema store: state is validated on read, supports partial `set`, and
 * falls back to default values when validation fails.
 *
 * @example
 * ```ts twoslash
 * import { createSchemaStore, createSchemaStoreMemoryProvider } from 'seitu'
 * import * as z from 'zod'
 *
 * const store = createSchemaStore({
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 * store.get()
 * store.set({ count: 1 })
 * store.subscribe(console.log)
 * ```
 */
export function createSchemaStore<S extends Record<string, StandardSchemaV1>>(options: SchemaStoreOptions<S>): SchemaStore<SchemaStoreOutput<S>> {
  const { subscribe, notify } = createSubscription()
  const defaultValues = { ...options.defaultValues }
  const provider = options.provider ?? createSchemaStoreMemoryProvider()

  const get = () => {
    const output = { ...defaultValues }

    for (const [key, schema] of Object.entries(options.schemas) as [keyof S, StandardSchemaV1<unknown, unknown>][]) {
      const item = provider.get()[key]

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
      provider.set(newValue)
      notify()
    },
    'getDefaultValue': key => defaultValues[key],
    'subscribe': (callback, options) => {
      return subscribe(() => callback(get()), options)
    },
    '~': {
      output: null as unknown as SchemaStoreOutput<S>,
      notify,
    },
  }
}

export interface SchemaStoreProvider<S extends SchemaStoreSchema> {
  get: () => SchemaStoreOutput<S>
  set: (value: Partial<SchemaStoreOutput<S>>) => void
}

/**
 * Creates an in-memory provider for a schema store. Use as the state backing when you don't
 * need persistence (e.g. for testing or ephemeral UI state).
 *
 * @example
 * ```ts twoslash
 * import { createSchemaStore, createSchemaStoreMemoryProvider } from 'seitu'
 * import * as z from 'zod'
 *
 * const store = createSchemaStore({
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 *   provider: createSchemaStoreMemoryProvider(),
 * })
 * ```
 */
export function createSchemaStoreMemoryProvider<S extends SchemaStoreSchema>(): SchemaStoreProvider<S> {
  const store = createStore<SchemaStoreOutput<S>>({} as SchemaStoreOutput<S>)
  return {
    get: () => store.get(),
    set: (value) => {
      store.set(value as SchemaStoreOutput<S>)
    },
  }
}
