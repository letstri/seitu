import type { Readable, Subscribable } from '../core/index'
import deepEqual from 'deep-equal'
import * as React from 'react'

/**
 * Use this hook to subscribe to a reactive value. The factory function is called only
 * once on first render — subsequent renders reuse the cached subscription.
 *
 * @kind hook
 *
 * @example
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { sessionStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * export default function Page() {
 *   const value = useSubscription(() => sessionStorageValue({
 *     key: 'test',
 *     defaultValue: 0,
 *     schema: z.number(),
 *   }))
 *
 *   return <div>{value}</div>
 * }
 * ```
 *
 * @example
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { createSessionStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = createSessionStorage({
 *   schemas: {
 *     count: z.number(),
 *     name: z.string(),
 *   },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * export default function Page() {
 *   // Usage with selector, re-renders only when count changes
 *   const count = useSubscription(() => sessionStorage, value => value.count)
 *
 *   return <div>{count}</div>
 * }
 * ```
 */
export function useSubscription<S extends Subscribable<any> & Readable<any>, R = S['~']['output']>(factory: () => S, selector?: (value: S['~']['output']) => R): R {
  const subscriptionRef = React.useRef<S | undefined>(undefined)
  if (subscriptionRef.current === undefined) {
    subscriptionRef.current = factory()
  }
  const subscription = subscriptionRef.current

  if (!subscription.get || !subscription.subscribe) {
    throw new Error('Subscription is not valid. It must have a get and subscribe method.')
  }

  const [value, setValue] = React.useState(() => selector ? selector(subscription.get()) : subscription.get())

  const getValue = React.useEffectEvent(() => value)

  React.useEffect(() => {
    return subscription.subscribe((next) => {
      const nextSelected = selector ? selector(next) : next

      if (deepEqual(nextSelected, getValue()))
        return

      setValue(nextSelected)
    })
  }, [subscription, selector])

  return value
}
