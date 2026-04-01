import type { ValidationSchemaErrorProps } from '../validate'

/**
 * Repair broken web storage value object if value was object but not all keys are in the default value object.
 *
 * @returns A new object with the existing keys in the value object that are not in the default value object.
 *
 * @example
 * ```ts
 * import { createWebStorageValue } from 'seitu/web'
 * import { repairWebStorageValueObjectWithDefault } from 'seitu/utils'
 * import * as z from 'zod'
 *
 * const value = createWebStorageValue({
 *   type: 'localStorage',
 *   schema: z.object({ a: z.number(), b: z.string() }),
 *   key: 'storage-key',
 *   defaultValue: { a: 0, b: 'default' },
 *   onValidationError: repairWebStorageValueObjectWithDefault,
 * })
 * value.get() // { a: 0, b: 'default' }
 * window.localStorage.setItem('storage-key', JSON.stringify({ a: 1 }))
 * value.get() // { a: 1, b: 'default' }
 * ```
 */
export function repairWebStorageValueObjectWithDefault<O extends Record<string, unknown>>(props: ValidationSchemaErrorProps<O>) {
  return {
    ...props.defaultValue,
    ...(typeof props.value === 'object' && props.value !== null
      ? Object.fromEntries(Object.entries(props.value).filter(([key]) => key in props.defaultValue))
      : {}),
  }
}
