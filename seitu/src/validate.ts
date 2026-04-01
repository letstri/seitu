import type { StandardSchemaV1 } from '@standard-schema/spec'
import { tryParseJson } from './utils'

export type ValidationSchemaOutput<S extends StandardSchemaV1<unknown>> = StandardSchemaV1.InferOutput<S>

export interface ValidationSchemaErrorProps<O> {
  defaultValue: O
  issues: StandardSchemaV1.Issue[]
  value: unknown
}

export interface ValidationSchemaObjectErrorProps<O extends Record<string, unknown>> {
  defaultValue: O[keyof O]
  issues: StandardSchemaV1.Issue[]
  value: unknown
  key: keyof O
}

export interface ValidateSchemaOptions {
  defaultValue: unknown
  label: string
  onError?: (issues: readonly StandardSchemaV1.Issue[], parsed: unknown) => unknown
}

export function validateSchema(
  schema: StandardSchemaV1,
  value: unknown,
  options: ValidateSchemaOptions,
): unknown {
  const parsed = tryParseJson(value)
  const result = schema['~standard'].validate(parsed)

  if (result instanceof Promise) {
    throw new TypeError(`[${options.label}] Validation schema should not return a Promise.`)
  }

  if (!result.issues) {
    return result.value
  }

  if (options.onError) {
    const corrected = options.onError(result.issues, parsed)

    if (corrected !== undefined) {
      const validated = schema['~standard'].validate(corrected)

      if (validated instanceof Promise) {
        throw new TypeError(`[${options.label}] Validation schema should not return a Promise.`)
      }

      if (validated.issues) {
        console.warn(`[${options.label}] Returned value invalid, returned default value instead`, JSON.stringify(validated.issues, null, 2), { cause: validated.issues })
      }
      else {
        return validated.value
      }
    }
  }
  else {
    console.warn(`[${options.label}] Returned value invalid, returned default value instead`, JSON.stringify(result.issues, null, 2), { cause: result.issues })
  }

  return options.defaultValue
}
