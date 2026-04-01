import type { Readable, Subscribable } from './subscription'
import { createReadableSubscription, createSubscription } from './subscription'

export interface ThrottledFn<F extends (...args: any[]) => any> extends Readable<ReturnType<F> | undefined>, Subscribable<ReturnType<F> | undefined> {
  (...args: Parameters<F>): void
}

/**
 * Wraps a plain function in a throttled callable that also acts as a subscribable.
 *
 * The first call fires immediately. Subsequent calls within the `wait` window are
 * batched — only the last one fires when the interval elapses. The return value of
 * the wrapped function becomes the current state, notifying subscribers.
 *
 * @example
 * ```ts twoslash
 * import { createThrottleFn } from 'seitu'
 *
 * const log = createThrottleFn((msg: string) => console.log(msg), 300)
 * log.subscribe(result => console.log('result:', result))
 * log('hello') // fires immediately
 * log('world') // throttled — fires after 300ms
 * log.get() // latest return value (undefined until first call)
 * ```
 */
export function createThrottleFn<F extends (...args: any[]) => any>(fn: F, wait: number): ThrottledFn<F> {
  let state: ReturnType<F> | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let trailingArgs: Parameters<F> | undefined
  const { subscribe, notify } = createSubscription()

  const get = (): ReturnType<F> | undefined => state

  const throttled: ThrottledFn<F> = Object.assign(
    (...args: Parameters<F>) => {
      if (timeoutId) {
        trailingArgs = args
        return
      }

      state = fn(...args)
      notify()

      timeoutId = setTimeout(() => {
        timeoutId = undefined
        if (trailingArgs) {
          const args = trailingArgs
          trailingArgs = undefined
          state = fn(...args)
          notify()
        }
      }, wait)
    },
    createReadableSubscription(get, subscribe, notify),
  )

  return throttled
}
