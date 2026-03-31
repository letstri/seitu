import type { Readable, Subscribable } from './subscription'
import { createSubscription } from './subscription'

export interface ThrottledFn<A extends unknown[], R> extends Readable<R | undefined>, Subscribable<R | undefined> {
  (...args: A): void
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
export function createThrottleFn<A extends unknown[], R>(fn: (...args: A) => R, wait: number): ThrottledFn<A, R> {
  let state: R | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let trailingArgs: A | undefined
  const { subscribe, notify } = createSubscription()

  const get = (): R | undefined => state

  const throttled: ThrottledFn<A, R> = Object.assign(
    (...args: A) => {
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
    {
      get,
      'subscribe': (callback: (value: R | undefined) => any, options?: any) => {
        return subscribe(() => callback(get()), options)
      },
      '~': {
        output: undefined!,
        notify,
      },
    },
  )

  return throttled
}
