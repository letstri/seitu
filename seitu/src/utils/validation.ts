import type { ValidationSchemaErrorProps } from '../validate'

export function repairValueObjectWithDefault<O extends Record<string, unknown>>(props: ValidationSchemaErrorProps<O>) {
  return {
    ...props.defaultValue,
    ...(typeof props.value === 'object' && props.value !== null
      ? Object.fromEntries(Object.entries(props.value).filter(([key, val]) => key in props.defaultValue && typeof val === typeof props.defaultValue[key]))
      : {}),
  }
}
