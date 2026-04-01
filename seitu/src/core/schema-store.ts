import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ValidationSchemaErrorProps } from '../validate'
import type { Readable, Subscribable, Writable } from './index'
import { createReadableSubscription, createStore, createSubscription } from '.'
import { validateSchema } from '../validate'

export interface SchemaStore<O extends Record<string, unknown>> extends Subscribable<O>, Readable<O>, Writable<O> {
  '~': {
    getDefaultValue: <K extends keyof O>(key: K) => O[K]
  } & Subscribable<O>['~']
}

export interface SchemaStoreOptions<O extends Record<string, unknown>> {
  schema: StandardSchemaV1<unknown, O>
  defaultValue: O
  /**
   * Handle validation errors.
   *
   * If returns a value, it will be validated and used as the store value.
   * If returns undefined, the default value will be returned.
   */
  onValidationError?: (props: ValidationSchemaErrorProps<O>) => void | O
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
 *   schema: z.object({ count: z.number(), name: z.string() }),
 *   defaultValue: { count: 0, name: '' },
 * })
 * store.get()
 * store.set({ count: 1 })
 * store.subscribe(console.log)
 * ```
 */
export function createSchemaStore<O extends Record<string, unknown>>(options: SchemaStoreOptions<O>): SchemaStore<O> {
  const store = createStore<O>(options.defaultValue)
  const { subscribe, notify } = createSubscription()
  const defaultValue = { ...options.defaultValue }

  const get = () => {
    const stored = store.get()
    const merged = { ...defaultValue, ...stored }

    return validateSchema(options.schema, merged, {
      defaultValue,
      label: 'createSchemaStore',
      onError: options.onValidationError
        ? (issues, parsed) => options.onValidationError!({ issues: [...issues], value: parsed, defaultValue })
        : undefined,
    }) as O
  }

  const readable = createReadableSubscription(get, subscribe, notify)

  return {
    ...readable,
    'set': (value) => {
      const newValue = typeof value === 'function' ? value(get()) : value
      store.set(newValue)
      notify()
    },
    '~': {
      ...readable['~'],
      getDefaultValue: key => defaultValue[key],
    },
  }
}
