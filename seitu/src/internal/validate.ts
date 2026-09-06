import type { StandardSchemaV1 } from '@standard-schema/spec'

export type ValidationSchemaOutput<S extends StandardSchemaV1<unknown>> =
  StandardSchemaV1.InferOutput<S>

export interface ValidationSchemaErrorProps<O> {
  defaultValue: O
  issues: StandardSchemaV1.Issue[]
  value: unknown
}

export interface ValidationSchemaObjectErrorProps<
  O extends Record<string, unknown>,
> extends ValidationSchemaErrorProps<O[keyof O]> {
  key: keyof O
}

export interface ValidateSchemaOptions<O = unknown, K = never> {
  defaultValue: O
  label: string
  key?: K
  onError?: (props: ValidationSchemaErrorProps<O> & { key: K }) => unknown
}

export function validateSync(
  schema: StandardSchemaV1,
  value: unknown,
  label: string
) {
  const result = schema['~standard'].validate(value)

  if (result instanceof Promise) {
    throw new TypeError(
      `[${label}] Validation schema should not return a Promise.`
    )
  }

  return result
}

export function validateSchema<O, K = never>(
  schema: StandardSchemaV1,
  value: unknown,
  options: ValidateSchemaOptions<O, K>
): unknown {
  const result = validateSync(schema, value, options.label)

  if (!result.issues) {
    return result.value
  }

  let issues = result.issues

  if (options.onError) {
    const corrected = options.onError({
      defaultValue: options.defaultValue,
      issues: [...result.issues],
      value,
      key: options.key as K,
    })

    if (corrected === undefined) {
      return options.defaultValue
    }

    const validated = validateSync(schema, corrected, options.label)

    if (!validated.issues) {
      return validated.value
    }

    issues = validated.issues
  }

  console.warn(
    `[${options.label}] Returned value invalid, returned default value instead`,
    JSON.stringify(issues, null, 2)
  )

  return options.defaultValue
}
