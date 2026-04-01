import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ValidationObjectSchemas, ValidationObjectSchemasOutput } from '../validate'
import type { Readable, Subscribable, Writable } from './index'
import { createReadableSubscription, createStore, createSubscription } from '.'
import { validateSchema } from '../validate'

export interface SchemaStore<O extends Record<string, unknown>> extends Subscribable<O>, Readable<O>, Writable<Partial<O>, O> {
  '~': {
    getDefaultValue: <K extends keyof O>(key: K) => O[K]
  } & Subscribable<O>['~']
}

export interface SchemaStoreOptions<S extends Record<string, StandardSchemaV1>> {
  schemas: S
  defaultValues: ValidationObjectSchemasOutput<S>
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
export function createSchemaStore<S extends Record<string, StandardSchemaV1>>(options: SchemaStoreOptions<S>): SchemaStore<ValidationObjectSchemasOutput<S>> {
  const { subscribe, notify } = createSubscription()
  const defaultValues = { ...options.defaultValues }
  const provider = options.provider ?? createSchemaStoreMemoryProvider()

  const get = () => {
    const output = { ...defaultValues }

    for (const [key, schema] of Object.entries(options.schemas) as [keyof S, StandardSchemaV1<unknown, unknown>][]) {
      output[key] = validateSchema(schema, provider.get()[key], {
        defaultValue: defaultValues[key],
        label: `createSchemaStore:${String(key)}`,
      })
    }

    return output
  }

  const readable = createReadableSubscription(get, subscribe, notify)

  return {
    ...readable,
    'set': (value) => {
      const newValue = typeof value === 'function' ? value(get()) : value
      provider.set(newValue)
      notify()
    },
    '~': {
      ...readable['~'],
      getDefaultValue: key => defaultValues[key],
    },
  }
}

export interface SchemaStoreProvider<S extends ValidationObjectSchemas> {
  get: () => ValidationObjectSchemasOutput<S>
  set: (value: Partial<ValidationObjectSchemasOutput<S>>) => void
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
export function createSchemaStoreMemoryProvider<S extends ValidationObjectSchemas>(): SchemaStoreProvider<S> {
  const store = createStore<ValidationObjectSchemasOutput<S>>({} as ValidationObjectSchemasOutput<S>)
  return {
    get: () => store.get(),
    set: (value) => {
      store.set(value as ValidationObjectSchemasOutput<S>)
    },
  }
}
