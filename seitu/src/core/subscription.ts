export interface Subscribable<V> {
  'subscribe': (callback: (value: V) => any) => () => void
  '~': {
    output: V
    notify: () => void
  }
}
export interface Readable<T> {
  get: () => T
}
export interface Writable<T> {
  set: (value: T | ((prev: T) => T)) => any
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
