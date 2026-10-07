import type { StandardSchemaV1 } from '@standard-schema/spec'

import type {
  ValidationSchemaErrorProps,
  ValidationSchemaOutput,
} from '../../internal/validate'
import { validateSchema } from '../../internal/validate'
import type { Readable, Subscribable, Writable } from '../subscription'
import { createReadableSubscription, createSubscription } from '../subscription'

export interface SchemaStore<O>
  extends Subscribable<O>, Readable<O>, Writable<O, O> {}

export interface SchemaStoreOptions<S extends StandardSchemaV1<unknown>> {
  schema: S
  defaultValue: ValidationSchemaOutput<S>
  /** Return a repaired value, or nothing to fall back to `defaultValue`. */
  onValidationError?: (
    props: ValidationSchemaErrorProps<ValidationSchemaOutput<S>>
  ) => void | ValidationSchemaOutput<S>
}

/**
 * Reactive store validated on read. Invalid values fall back to `defaultValue`.
 * Validation is memoized on the raw state reference.
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
export function createSchemaStore<S extends StandardSchemaV1<unknown>>(
  options: SchemaStoreOptions<S>
): SchemaStore<ValidationSchemaOutput<S>> {
  type Updater = (prev: ValidationSchemaOutput<S>) => ValidationSchemaOutput<S>

  let state: unknown = options.defaultValue
  const { subscribe, notify } = createSubscription()

  const UNSET = Symbol('seitu.unset')
  let lastInput: unknown = UNSET
  let lastOutput: ValidationSchemaOutput<S>

  const get = (): ValidationSchemaOutput<S> => {
    const raw = state

    if (raw === lastInput) {
      return lastOutput
    }

    lastOutput = validateSchema(options.schema, raw, {
      defaultValue: options.defaultValue,
      label: 'createSchemaStore',
      onError: options.onValidationError,
    }) as ValidationSchemaOutput<S>
    lastInput = raw

    return lastOutput
  }

  return {
    ...createReadableSubscription(get, subscribe, notify),
    set: (value) => {
      const next =
        typeof value === 'function' ? (value as Updater)(get()) : value
      if (next === state) {
        return
      }
      state = next
      notify()
    },
  }
}
