/**
 * Parses JSON; returns the input when it is not a string or is invalid JSON.
 *
 * @example
 * ```ts twoslash
 * import { tryParseJson } from 'seitu/utils'
 *
 * tryParseJson('{"a":1}') // { a: 1 }
 * tryParseJson('oops') // 'oops'
 * ```
 */
export function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
