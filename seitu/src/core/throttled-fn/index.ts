import type { Readable, Subscribable } from '../subscription'
import { createReadableSubscription, createSubscription } from '../subscription'

export interface ThrottledFn<F extends (...args: any[]) => any>
  extends
    Readable<ReturnType<F> | undefined>,
    Subscribable<ReturnType<F> | undefined> {
  (...args: Parameters<F>): void
  /** Drop the pending trailing call and reset the throttle window. */
  cancel: () => void
  /** Run the pending trailing call now and reset the window. No-op if nothing is pending. */
  flush: () => void
  pending: () => boolean
}

/**
 * Throttled callable that is also a subscribable. First call fires immediately;
 * later calls within `wait` batch into one trailing call.
 *
 * @example
 * ```ts twoslash
 * import { createThrottledFn } from 'seitu'
 *
 * const log = createThrottledFn((msg: string) => console.log(msg), 300)
 * log.subscribe(result => console.log('result:', result))
 * log('hello') // fires immediately
 * log('world') // throttled — fires after 300ms
 * log.get() // latest return value (undefined until first call)
 * log.flush() // run the trailing call now
 * ```
 */
export function createThrottledFn<F extends (...args: any[]) => any>(
  fn: F,
  wait: number
): ThrottledFn<F> {
  let state: ReturnType<F> | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let trailingArgs: Parameters<F> | undefined
  const { subscribe, notify } = createSubscription()

  const get = (): ReturnType<F> | undefined => state

  const cancel = () => {
    clearTimeout(timeoutId)
    timeoutId = undefined
    trailingArgs = undefined
  }

  const invoke = (args: Parameters<F>) => {
    state = fn(...args)
    notify()
  }

  const flush = () => {
    const args = trailingArgs
    cancel()
    if (args) {
      invoke(args)
    }
  }

  const throttled: ThrottledFn<F> = Object.assign(
    (...args: Parameters<F>) => {
      if (timeoutId) {
        trailingArgs = args
        return
      }

      invoke(args)

      timeoutId = setTimeout(flush, wait)
    },
    createReadableSubscription(get, subscribe, notify),
    { cancel, flush, pending: () => trailingArgs !== undefined }
  )

  return throttled
}
