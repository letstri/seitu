export interface SubscribeOptions {
  /** Call the callback immediately with the current value. */
  immediate?: boolean
}

export interface Subscribable<V> {
  subscribe: (
    callback: (value: V) => any,
    options?: SubscribeOptions
  ) => () => void
  '~': {
    output: V
    notify: () => void
  }
}
export interface Readable<T> {
  get: () => T
  /**
   * SSR/hydration value. Bindings use this instead of `get()` so the first
   * client render matches server HTML. Omitted: `get()` is used on both sides.
   */
  getServer?: () => T
}
/** A `Readable` that always has `getServer()`. Every `seitu/web` handle implements it. */
export interface ServerReadable<T> extends Readable<T> {
  getServer: () => T
}
export interface Writable<T, P = T> {
  set: (value: T | ((prev: P) => T)) => any
}
export interface Clearable {
  clear: () => void
}

export function createReadableSubscription<T>(
  get: () => T,
  subscribe: (callback: () => any, options?: SubscribeOptions) => () => void,
  notify: () => void,
  getServer: () => T
): ServerReadable<T> & Subscribable<T>
export function createReadableSubscription<T>(
  get: () => T,
  subscribe: (callback: () => any, options?: SubscribeOptions) => () => void,
  notify: () => void,
  getServer?: (() => T) | undefined
): Readable<T> & Subscribable<T>
export function createReadableSubscription<T>(
  get: () => T,
  subscribe: (callback: () => any, options?: SubscribeOptions) => () => void,
  notify: () => void,
  getServer?: () => T
): Readable<T> & Subscribable<T> {
  return {
    get,
    ...(getServer ? { getServer } : {}),
    subscribe(callback, options) {
      return subscribe(() => callback(get()), options)
    },
    '~': {
      output: null as unknown as T,
      notify,
    },
  }
}

export interface Subscription {
  subscribe: (callback: () => any, options?: SubscribeOptions) => () => void
  notify: () => void
  readonly size: number
}

/**
 * Subscribe/notify primitive used by every reactive handle.
 *
 * - `onFirstSubscribe` attaches on first subscriber and cleans up on last.
 * - `notify` calls every subscriber; the first throw is rethrown after the loop.
 * - `size` is the subscriber count.
 *
 * @example
 * ```ts twoslash
 * import { createSubscription } from 'seitu'
 *
 * const { subscribe, notify, size } = createSubscription({
 *   onFirstSubscribe: () => {
 *     const id = setInterval(notify, 1000)
 *     return () => clearInterval(id)
 *   },
 * })
 * ```
 */
export function createSubscription(options?: {
  onFirstSubscribe?: () => void | (() => void)
}): Subscription {
  const subscribers = new Set<() => void>()
  let onEmpty: (() => void) | undefined

  const notify = () => {
    let error: { caught: unknown } | undefined

    // Copy the set so subscribers added during notify are skipped this round.
    for (const cb of [...subscribers]) {
      if (!subscribers.has(cb)) {
        continue
      }

      try {
        cb()
      } catch (caught) {
        error ??= { caught }
      }
    }

    if (error) {
      throw error.caught
    }
  }

  return {
    subscribe(callback, opts) {
      if (subscribers.size === 0 && options?.onFirstSubscribe) {
        onEmpty = options.onFirstSubscribe() ?? undefined
      }

      subscribers.add(callback)

      if (opts?.immediate) {
        callback()
      }

      return () => {
        if (!subscribers.delete(callback)) {
          return
        }

        if (subscribers.size === 0) {
          onEmpty?.()
          onEmpty = undefined
        }
      }
    },
    notify,
    get size() {
      return subscribers.size
    },
  }
}
