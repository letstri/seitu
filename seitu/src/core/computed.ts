import type { Readable, Subscribable } from './subscription'
import { createSubscription } from './subscription'

export interface Computed<T> extends Readable<T>, Subscribable<T> {}

/**
 * Creates a computed (derived) store from a source store. The computed value is
 * updated whenever the source updates; it is read-only (no set).
 *
 * @example
 * const count = createStore({ a: 1, b: 2 })
 * const sum = createComputed(count, s => s.a + s.b)
 * sum.get() // 3
 * count.set({ a: 2, b: 2 })
 * sum.get() // 4
 */
export function createComputed<T, R>(
  source: Readable<T> & Subscribable<T>,
  transform: (value: T) => R,
): Computed<R> {
  const { subscribe, notify } = createSubscription()

  const get = (): R => transform(source.get())

  source.subscribe(() => notify())

  return {
    get,
    subscribe(callback) {
      return subscribe(() => callback(get()))
    },
    '~': {
      output: null as unknown as R,
      notify,
    },
  }
}
