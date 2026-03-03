import type { Readable, Subscribable } from '../core/subscription'
import deepEqual from 'deep-equal'
import * as React from 'react'

/**
 * Use this hook to access a subscription for any function that implements the Subscription interface.
 *
 * @kind hook
 *
 * @example
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { sessionStorageValue } from 'utix/web'
 * import { useSubscription } from 'utix/react'
 * import * as z from 'zod'
 *
 * export default function Page() {
 *   const value = useSubscription(sessionStorageValue({
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
 * import { sessionStorageValue } from 'utix/web'
 * import { useSubscription } from 'utix/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = sessionStorageValue({
 *   key: 'test',
 *   defaultValue: 0,
 *   schema: z.number(),
 * })
 *
 * export default function Page() {
 *   const value = useSubscription(sessionStorage)
 *
 *   return <div>{value}</div>
 * }
 * ```
 *
 * @example
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { createSessionStorage, sessionStorageValue } from 'utix/web'
 * import { useSubscription } from 'utix/react'
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
 * // Usage with selector, re-renders only when count changes
 * export default function Page() {
 *   const count = useSubscription(sessionStorage, value => value.count)
 *
 *   return <div>{count}</div>
 * }
 * ```
 */
export function useSubscription<S extends Subscribable<any> & Readable<any>, R = S['~types']['output']>(subscription: S, selector?: (value: S['~types']['output']) => R): R {
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
