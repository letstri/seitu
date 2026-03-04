export type MaybePromise<T> = T | Promise<T>

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

export type Satisfies<T extends U, U> = T

export type PartialForKeys<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>

export function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  }
  catch {
    return value
  }
}
