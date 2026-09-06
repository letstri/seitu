import type { ServerReadable, Subscribable } from '../../core'
import { createReadableSubscription, createSubscription } from '../../core'

export interface IsOnline
  extends Subscribable<boolean>, ServerReadable<boolean> {}

/**
 * Reactive browser online status. On the server, `get()` and the SSR snapshot
 * are `true`.
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
      if (typeof window === 'undefined') {
        return
      }

      const handler = () => notify()
      window.addEventListener('online', handler)
      window.addEventListener('offline', handler)

      return () => {
        window.removeEventListener('online', handler)
        window.removeEventListener('offline', handler)
      }
    },
  })

  const get = (): boolean =>
    typeof navigator === 'undefined' ? true : navigator.onLine

  return createReadableSubscription(get, subscribe, notify, () => true)
}
