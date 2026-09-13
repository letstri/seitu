import type { Readable, Subscribable } from '../subscription'
import { createReadableSubscription, createSubscription } from '../subscription'

export interface Debounced<T> extends Readable<T>, Subscribable<T> {
  /** Drop a pending update. The current value is unchanged. */
  cancel: () => void
  /** Emit a pending update now. No-op if nothing is pending. */
  flush: () => void
}

/**
 * Debounces updates from a source. Unsubscribed `get()` reads through;
 * subscribed `get()` returns the last emitted value.
 *
 * @example
 * ```ts twoslash
 * import { createStore, createDebounced } from 'seitu'
 *
 * const store = createStore('')
 * const debounced = createDebounced(store, 300)
 * debounced.subscribe(value => console.log('debounced:', value))
 * debounced.flush()
 * ```
 */
export function createDebounced<T>(
  source: Readable<T> & Subscribable<T>,
  wait: number
): Debounced<T> {
  let state = source.get()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let active = false

  const cancel = () => {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe() {
      state = source.get()
      active = true

      const unsubscribe = source.subscribe(() => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          timeoutId = undefined
          state = source.get()
          notify()
        }, wait)
      })

      return () => {
        cancel()
        active = false
        unsubscribe()
      }
    },
  })

  const flush = () => {
    if (timeoutId === undefined) {
      return
    }

    cancel()
    state = source.get()
    notify()
  }

  const get = () => (active ? state : source.get())

  return {
    ...createReadableSubscription(get, subscribe, notify, source.getServer),
    cancel,
    flush,
  }
}
