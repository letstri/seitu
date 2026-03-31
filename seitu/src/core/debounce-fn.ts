import type { Readable, Subscribable } from './subscription'
import { createSubscription } from './subscription'

export interface DebouncedFn<A extends unknown[], R> extends Readable<R | undefined>, Subscribable<R | undefined> {
  (...args: A): void
}

/**
 * Wraps a plain function in a debounced callable that also acts as a subscribable.
 *
 * Each call resets the debounce timer. When the timer fires, the wrapped function
 * is invoked and its return value becomes the current state, notifying subscribers.
 *
 * @example
 * ```ts twoslash
 * import { createDebounceFn } from 'seitu'
 *
 * const search = createDebounceFn((query: string) => fetch(`/api?q=${query}`), 300)
 * search.subscribe(result => console.log('result:', result))
 * search('hello') // debounced — fires after 300ms of inactivity
 * search.get() // latest return value (undefined until first call)
 * ```
 */
export function createDebounceFn<A extends unknown[], R>(fn: (...args: A) => R, wait: number): DebouncedFn<A, R> {
  let state: R | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const { subscribe, notify } = createSubscription()

  const get = (): R | undefined => state

  const debounced: DebouncedFn<A, R> = Object.assign(
    (...args: A) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        state = fn(...args)
        notify()
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

  return debounced
}
