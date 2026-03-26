import type { Readable, Subscribable, Writable } from './subscription'
import { createSubscription } from './subscription'

export interface Store<T> extends Readable<T>, Writable<T, T>, Subscribable<T> {}

/**
 * Creates a simple reactive store (minimal TanStack Store–style API).
 *
 * - **Standalone**: use `get()`, `set(value | updater)`, `subscribe(callback)` for any state.
 * - **With schema-store**: use as the state backing for a memory provider.
 *
 * @example
 * ```ts twoslash
 * import { createStore } from 'seitu'
 *
 * const store = createStore({ count: 0 })
 * store.set(prev => ({ ...prev, count: prev.count + 1 }))
 * store.subscribe(state => console.log(state))
 * store.get() // { count: 0 }
 * ```
 */
export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const { subscribe, notify } = createSubscription()

  const get = (): T => state

  return {
    get,
    'set': (value) => {
      const next = typeof value === 'function' ? (value as (prev: T) => T)(state) : value
      if (next === state)
        return
      state = next
      notify()
    },
    subscribe(callback, options) {
      return subscribe(() => callback(get()), options)
    },
    '~': {
      output: null as unknown as T,
      notify,
    },
  }
}
