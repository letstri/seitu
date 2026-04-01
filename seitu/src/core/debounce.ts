import type { Readable, Subscribable } from './subscription'
import { createReadableSubscription, createSubscription } from './subscription'

export interface Debounced<T> extends Readable<T>, Subscribable<T> {}

/**
 * Creates a debounced readable that delays updates from a source subscribable.
 *
 * The debounced store will only emit the latest value after `wait` milliseconds
 * of inactivity from the source.
 *
 * @example
 * ```ts twoslash
 * import { createStore, createDebounce } from 'seitu'
 *
 * const store = createStore('')
 * const debounced = createDebounce(store, 300)
 * debounced.subscribe(value => console.log('debounced:', value))
 * ```
 */
export function createDebounce<T>(source: Readable<T> & Subscribable<T>, wait: number): Debounced<T> {
  let state = source.get()
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe() {
      const unsubscribe = source.subscribe(() => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          state = source.get()
          notify()
        }, wait)
      })

      return () => {
        clearTimeout(timeoutId)
        unsubscribe()
      }
    },
  })

  const get = () => state

  return createReadableSubscription(get, subscribe, notify)
}
