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
 * const store = createStore({ count: 0 })
 * store.set(prev => ({ ...prev, count: prev.count + 1 }))
 * store.subscribe(state => console.log(state))
 */
export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const { subscribe: sub, notify } = createSubscription<void>()

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
    subscribe(callback) {
      return sub(() => callback(get()))
    },
    '~': {
      output: null as unknown as T,
      notify,
    },
  }
}

export type Computed<T> = Readable<T> & Subscribable<T>

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
  const { subscribe: sub, notify } = createSubscription<void>()

  const get = (): R => transform(source.get())

  source.subscribe(() => notify())

  return {
    get,
    subscribe(callback) {
      return sub(() => callback(get()))
    },
    '~': {
      output: null as unknown as R,
      notify,
    },
  }
}
