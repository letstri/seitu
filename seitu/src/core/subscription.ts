export interface Subscribable<V> {
  'subscribe': (callback: (value: V) => any) => () => void
  '~types': {
    output: V
  }
}
export interface Readable<T> {
  get: () => T
}
export interface Writable<T, P extends Partial<T> = T> {
  set: (value: T | ((prev: P) => T)) => any
}
export interface Removable {
  remove: () => void
}

export function createSubscription<V>(): {
  subscribe: (callback: (value: V) => any) => () => void
  notify: (value: V) => void
} {
  const subscribers = new Set<(value: V) => void>()
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
