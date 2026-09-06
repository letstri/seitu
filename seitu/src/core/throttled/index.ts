import type { Readable, Subscribable } from '../subscription'
import { createReadableSubscription, createSubscription } from '../subscription'

export interface Throttled<T> extends Readable<T>, Subscribable<T> {
  /** Drop a pending trailing update and reset the throttle window. */
  cancel: () => void
  /** Emit a pending trailing update now and reset the window. No-op if nothing is pending. */
  flush: () => void
}

/**
 * Throttles updates from a source to at most once per `wait` ms (leading, then
 * trailing). Unsubscribed `get()` reads through; subscribed `get()` returns the
 * last emitted value.
 *
 * @example
 * ```ts twoslash
 * import { createStore, createThrottled } from 'seitu'
 *
 * const store = createStore('')
 * const throttled = createThrottled(store, 300)
 * throttled.subscribe(value => console.log('throttled:', value))
 * ```
 */
export function createThrottled<T>(
  source: Readable<T> & Subscribable<T>,
  wait: number
): Throttled<T> {
  let state = source.get()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let hasTrailing = false
  let active = false

  const cancel = () => {
    clearTimeout(timeoutId)
    timeoutId = undefined
    hasTrailing = false
  }

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe() {
      state = source.get()
      active = true

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
        cancel()
        active = false
        unsubscribe()
      }
    },
  })

  const flush = () => {
    if (!hasTrailing) {
      cancel()
      return
    }

    cancel()
    state = source.get()
    notify()
  }

  const get = (): T => (active ? state : source.get())

  return {
    ...createReadableSubscription(get, subscribe, notify, source.getServer),
    cancel,
    flush,
  }
}
