import type { Readable, Subscribable } from './subscription'
import { createReadableSubscription, createSubscription } from './subscription'

export interface DebouncedFn<F extends (...args: any[]) => any> extends Readable<ReturnType<F> | undefined>, Subscribable<ReturnType<F> | undefined> {
  (...args: Parameters<F>): void
}

/**
 * Wraps a plain function in a debounced callable that also acts as a subscribable.
 *
 * Each call resets the debounce timer. When the timer fires, the wrapped function
 * is invoked and its return value becomes the current state, notifying subscribers.
 *
 * @example
 * ```ts twoslash
 * import { createDebouncedFn } from 'seitu'
 *
 * const search = createDebouncedFn((query: string) => fetch(`/api?q=${query}`), 300)
 * search.subscribe(result => console.log('result:', result))
 * search('hello') // debounced — fires after 300ms of inactivity
 * search.get() // latest return value (undefined until first call)
 * ```
 */
export function createDebouncedFn<F extends (...args: any[]) => any>(fn: F, wait: number): DebouncedFn<F> {
  let state: ReturnType<F> | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const { subscribe, notify } = createSubscription()

  const get = (): ReturnType<F> | undefined => state

  const debounced: DebouncedFn<F> = Object.assign(
    (...args: Parameters<F>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        state = fn(...args)
        notify()
      }, wait)
    },
    createReadableSubscription(get, subscribe, notify),
  )

  return debounced
}
