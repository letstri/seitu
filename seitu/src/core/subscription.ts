export interface Subscribable<V> {
  'subscribe': (callback: (value: V) => any) => () => void
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
export function createSubscription<T = void>(): {
  subscribe: (callback: (payload: T) => any) => () => void
  notify: (payload: T) => void
} {
  const subscribers = new Set<(payload: T) => void>()
  return {
    subscribe(callback) {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
    notify(payload) {
      subscribers.forEach(cb => cb(payload))
    },
  }
}
