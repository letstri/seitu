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
export interface Destroyable {
  destroy: () => void
}

export function createSubscription(): {
  subscribe: (callback: () => any, options?: SubscribeOptions) => () => void
  notify: () => void
} {
  const subscribers = new Set<() => void>()
  return {
    subscribe(callback, options) {
      if (options?.immediate)
        callback()

      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
    notify() {
      subscribers.forEach(cb => cb())
    },
  }
}
