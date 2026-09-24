import type { Readable, Subscribable, Writable } from '../subscription'
import { createReadableSubscription, createSubscription } from '../subscription'

export interface Store<T>
  extends Readable<T>, Writable<T, T>, Subscribable<T> {}

/**
 * Creates a reactive store with `get()`, `set()`, and `subscribe()`.
 *
 * @example
 * ```ts twoslash
 * import { createStore } from 'seitu'
 *
 * const store = createStore({ count: 0 })
 * store.set(prev => ({ ...prev, count: prev.count + 1 }))
 * store.subscribe(state => console.log(state))
 * store.get() // { count: 1 }
 * ```
 */
export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const { subscribe, notify } = createSubscription()

  const get = (): T => state

  const readable = createReadableSubscription(get, subscribe, notify)

  return {
    ...readable,
    set: (value) => {
      const next =
        typeof value === 'function' ? (value as (prev: T) => T)(state) : value
      if (next === state) {
        return
      }
      state = next
      notify()
    },
  }
}
