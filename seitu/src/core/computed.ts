import type { Readable, Subscribable } from './subscription'
import { createSubscription } from './subscription'

export interface Computed<T> extends Readable<T>, Subscribable<T> {}

type Source<T = unknown> = Readable<T> & Subscribable<T>
type SourceValues<S extends readonly Source[]> = {
  [K in keyof S]: S[K] extends Source<infer V> ? V : never
}

/**
 * Creates a computed (derived) subscription from a subscription or an array of subscriptions.
 * The computed value is updated whenever any subscription updates.
 *
 * @example
 * ```ts twoslash
 * import { createComputed, createStore } from 'seitu'
 *
 * const count = createStore({ a: 1, b: 2 })
 * const sum = createComputed(count, s => s.a + s.b)
 * sum.get() // 3
 * ```
 *
 * @example
 * ```ts twoslash
 * import { createComputed, createStore } from 'seitu'
 *
 * const a = createStore(1)
 * const b = createStore(2)
 * const sum = createComputed([a, b], ([a, b]) => a + b)
 * sum.get() // 3
 * ```
 */
export function createComputed<S extends readonly Source[], R>(
  sources: [...S],
  transform: (values: SourceValues<S>) => R,
): Computed<R>
export function createComputed<T, R>(
  source: Source<T>,
  transform: (value: T) => R,
): Computed<R>
export function createComputed(
  source: Source | Source[],
  transform: (value: any) => any,
): Computed<any> {
  const { subscribe, notify } = createSubscription()
  const sources = Array.isArray(source) ? source : [source]
  const isSingle = !Array.isArray(source)

  const get = () =>
    transform(isSingle ? sources[0].get() : sources.map(s => s.get()))

  for (const s of sources) s.subscribe(() => notify())

  return {
    get,
    subscribe(callback) {
      return subscribe(() => callback(get()))
    },
    '~': {
      output: null as unknown,
      notify,
    },
  }
}
