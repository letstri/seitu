import type { Readable, Subscribable } from './subscription'
import { createSubscription } from './subscription'

export interface Throttled<T> extends Readable<T>, Subscribable<T> {}

/**
 * Creates a throttled readable that rate-limits updates from a source subscribable.
 *
 * Emits the latest value at most once every `wait` milliseconds. The first update
 * fires immediately, then subsequent updates are batched until the interval elapses.
 *
 * @example
 * ```ts twoslash
 * import { createStore, createThrottle } from 'seitu'
 *
 * const store = createStore('')
 * const throttled = createThrottle(store, 300)
 * throttled.subscribe(value => console.log('throttled:', value))
 * ```
 */
export function createThrottle<T>(source: Readable<T> & Subscribable<T>, wait: number): Throttled<T> {
  let state = source.get()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let hasTrailing = false

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe() {
      const unsubscribe = source.subscribe(() => {
        if (timeoutId) {
          hasTrailing = true
          return
        }

        state = source.get()
        notify()

        timeoutId = setTimeout(() => {
          timeoutId = undefined
          if (hasTrailing) {
            hasTrailing = false
            state = source.get()
            notify()
          }
        }, wait)
      })

      return () => {
        clearTimeout(timeoutId)
        timeoutId = undefined
        hasTrailing = false
        unsubscribe()
      }
    },
  })

  const get = (): T => state

  return {
    get,
    subscribe(callback: any, options: any) {
      return subscribe(() => callback(get()), options)
    },
    '~': {
      output: null as unknown as T,
      notify,
    },
  }
}
