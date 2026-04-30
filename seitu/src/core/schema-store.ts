import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ValidationSchemaErrorProps, ValidationSchemaOutput } from '../validate'
import type { Readable, Subscribable, Writable } from './index'
import { createReadableSubscription, createStore } from '.'
import { validateSchema } from '../validate'

export interface SchemaStore<O> extends Subscribable<O>, Readable<O>, Writable<O, O> {}

export interface SchemaStoreOptions<S extends StandardSchemaV1<unknown>> {
  schema: S
  defaultValue: ValidationSchemaOutput<S>
  /**
   * Handle validation errors.
   *
   * If returns a value, it will be validated and used as the store value.
   * If returns undefined, the default value will be returned.
   */
  onValidationError?: (props: ValidationSchemaErrorProps<ValidationSchemaOutput<S>>) => void | ValidationSchemaOutput<S>
}

/**
 * Creates a reactive schema store: state is validated on read, supports partial `set`, and
 * falls back to default values when validation fails.
 *
 * @example
 * ```ts twoslash
 * import { createSchemaStore } from 'seitu'
 * import * as z from 'zod'
 *
 * const store = createSchemaStore({
 *   schema: z.object({ count: z.number(), name: z.string() }),
 *   defaultValue: { count: 0, name: '' },
 * })
 * store.get()
 * store.set({ count: 1, name: 'alice' })
 * store.subscribe(console.log)
 * ```
 */
export function createSchemaStore<S extends StandardSchemaV1<unknown>>(options: SchemaStoreOptions<S>): SchemaStore<ValidationSchemaOutput<S>> {
  const store = createStore<ValidationSchemaOutput<S>>(options.defaultValue)

  const get = (): ValidationSchemaOutput<S> => {
    const stored = store.get()

    return validateSchema(options.schema, stored, {
      defaultValue: options.defaultValue,
      label: 'createSchemaStore',
      onError: options.onValidationError
        ? (issues, parsed) => options.onValidationError!({ issues: [...issues], value: parsed, defaultValue: options.defaultValue })
        : undefined,
    }) as ValidationSchemaOutput<S>
  }

  const readable = createReadableSubscription(get, store.subscribe, store['~'].notify)

  return {
    ...readable,
    set: (value) => {
      const newValue = typeof value === 'function' ? (value as (prev: ValidationSchemaOutput<S>) => ValidationSchemaOutput<S>)(get()) : value
      store.set(newValue)
    },
  }
}
