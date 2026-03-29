export interface SubscribeOptions {
  /**
   * When `true`, the callback is invoked immediately with the current value upon subscribing.
   */
  immediate?: boolean
}

export interface Subscribable<V> {
  'subscribe': (callback: (value: V) => any, options?: SubscribeOptions) => () => void
  '~': {
    /**
     * Type type with returned value of the subscription.
     */
    output: V
    /**
     * A function that notifies all subscribers that the value has changed.
     */
    notify: () => void
  }
}
export interface Readable<T> {
  get: () => T
}
export interface Writable<T, P = T> {
  set: (value: T | ((prev: P) => T)) => any
}
export interface Removable {
  remove: () => void
}

export function createSubscription(options?: {
  onFirstSubscribe?: () => (void | (() => void))
}): {
  subscribe: (callback: () => any, options?: SubscribeOptions) => () => void
  notify: () => void
} {
  const subscribers = new Set<() => void>()
  const notify = () => subscribers.forEach(cb => cb())
  let onEmpty: (() => void) | undefined

  return {
    subscribe(callback, opts) {
      if (subscribers.size === 0 && options?.onFirstSubscribe)
        onEmpty = options.onFirstSubscribe() ?? undefined

      if (opts?.immediate)
        callback()

      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          onEmpty?.()
          onEmpty = undefined
        }
      }
    },
    notify,
  }
}
