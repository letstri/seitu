import type { Readable, Subscribable } from '../subscription'
import { createReadableSubscription, createSubscription } from '../subscription'

export interface DebouncedFn<F extends (...args: any[]) => any>
  extends
    Readable<ReturnType<F> | undefined>,
    Subscribable<ReturnType<F> | undefined> {
  (...args: Parameters<F>): void
  cancel: () => void
  /** Run the pending call now. No-op if nothing is pending. */
  flush: () => void
  pending: () => boolean
}

/**
 * Debounced callable that is also a subscribable. Each call resets the timer;
 * the return value becomes the current state.
 *
 * @example
 * ```ts twoslash
 * import { createDebouncedFn } from 'seitu'
 *
 * const search = createDebouncedFn((query: string) => fetch(`/api?q=${query}`), 300)
 * search.subscribe(result => console.log('result:', result))
 * search('hello') // debounced — fires after 300ms of inactivity
 * search.get()
 * search.flush()
 * search.cancel()
 * ```
 */
export function createDebouncedFn<F extends (...args: any[]) => any>(
  fn: F,
  wait: number
): DebouncedFn<F> {
  let state: ReturnType<F> | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let pendingArgs: Parameters<F> | undefined
  const { subscribe, notify } = createSubscription()

  const get = (): ReturnType<F> | undefined => state

  const cancel = () => {
    clearTimeout(timeoutId)
    timeoutId = undefined
    pendingArgs = undefined
  }

  const run = () => {
    const args = pendingArgs!
    cancel()
    state = fn(...args)
    notify()
  }

  const flush = () => {
    if (timeoutId !== undefined) {
      run()
    }
  }

  const debounced: DebouncedFn<F> = Object.assign(
    (...args: Parameters<F>) => {
      clearTimeout(timeoutId)
      pendingArgs = args
      timeoutId = setTimeout(run, wait)
    },
    createReadableSubscription(get, subscribe, notify),
    { cancel, flush, pending: () => timeoutId !== undefined }
  )

  return debounced
}
