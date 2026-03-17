import type { Destroyable, Readable, Subscribable } from '../core/index'
import { createSubscription } from '../core/index'

export interface IsOnline extends Subscribable<boolean>, Readable<boolean>, Destroyable {}

/**
 * Creates a reactive handle for browser online status.
 *
 * @example Vanilla
 * ```ts twoslash
 * import { createIsOnline } from 'seitu/web'
 *
 * const isOnline = createIsOnline()
 *
 * isOnline.subscribe(value => {
 *   console.log(value ? 'online' : 'offline')
 * })
 *
 * console.log(isOnline.get())
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * import { createIsOnline } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * const isOnline = createIsOnline()
 *
 * function Status() {
 *   const online = useSubscription(isOnline)
 *   return online ? 'Connected' : 'Disconnected'
 * }
 * ```
 */
export function createIsOnline(): IsOnline {
  const { subscribe, notify } = createSubscription()

  const get = (): boolean => {
    if (typeof navigator === 'undefined') {
      return true
    }
    return navigator.onLine
  }

  const listener = () => notify()

  if (typeof window !== 'undefined') {
    window.addEventListener('online', listener)
    window.addEventListener('offline', listener)
  }

  return {
    get,
    'subscribe': (callback) => {
      return subscribe(() => callback(get()))
    },
    'destroy': () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', listener)
        window.removeEventListener('offline', listener)
      }
    },
    '~': {
      output: null as unknown as boolean,
      notify,
    },
  }
}
