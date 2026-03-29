import type { Readable, Subscribable } from '../core/index'
import { createSubscription } from '../core/index'

export interface IsOnline extends Subscribable<boolean>, Readable<boolean> {}

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
  const { subscribe, notify } = createSubscription({
    onFirstSubscribe: () => {
      if (typeof window !== 'undefined') {
        window.addEventListener('online', notify)
        window.addEventListener('offline', notify)
      }

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', notify)
          window.removeEventListener('offline', notify)
        }
      }
    },
  })

  const get = (): boolean => {
    if (typeof navigator === 'undefined') {
      return true
    }
    return navigator.onLine
  }

  return {
    get,
    'subscribe': (callback, options) => {
      return subscribe(() => callback(get()), options)
    },
    '~': {
      output: null as unknown as boolean,
      notify,
    },
  }
}
