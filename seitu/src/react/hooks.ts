import type { Readable, Subscribable } from '../core/index'
import { deepEqual } from 'fast-equals'
import * as React from 'react'

export interface UseSubscriptionOptions<S extends Subscribable<any> & Readable<any>, R = S['~']['output']> {
  selector?: (value: S['~']['output']) => R
  deps?: React.DependencyList
}

/**
 * Use this hook to subscribe to a reactive value. Accepts a subscription object
 * directly, or a factory function that is called only once on first render —
 * subsequent renders reuse the cached subscription unless dependency array changes.
 *
 * @example Inline subscription
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { createSessionStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * export default function Page() {
 *   const value = useSubscription(() => createSessionStorageValue({
 *     key: 'test',
 *     defaultValue: 0,
 *     schema: z.number(),
 *   }))
 *
 *   return <div>{value}</div>
 * }
 * ```
 *
 * @example Instance outside of component
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { createSessionStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = createSessionStorage({
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * export default function Page() {
 *   const value = useSubscription(sessionStorage)
 *   return <div>{value.count}</div>
 * }
 * ```
 *
 * @example Subscription with selector
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
 *   const count = useSubscription(sessionStorage, { selector: value => value.count })
 *
 *   return <div>{count}</div>
 * }
 * ```
 *
 * @example Ref example
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import * as React from 'react'
 * import { createScrollState } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * export default function Page() {
 *   const ref = React.useRef<HTMLDivElement>(null)
 *   const state = useSubscription(() => createScrollState({ element: () => ref.current, direction: 'vertical' }))
 *
 *   return (
 *     <div ref={ref}>
 *       {String(state.top.reached)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSubscription<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
>(
  source: S | (() => S),
  options?: UseSubscriptionOptions<S, R>,
): R {
  const { selector, deps = [] } = options ?? {}
  const isFactory = typeof source === 'function'
  const factoryFn = isFactory ? source : () => source

  const subscription = React.useMemo(
    () => factoryFn(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    isFactory ? deps : [source, ...deps],
  )

  const lastSnapshotRef = React.useRef<R | undefined>(undefined)
  const subscriptionRef = React.useRef(subscription)
  const selectorRef = React.useRef(selector)
  if (subscriptionRef.current !== subscription || selectorRef.current !== selector) {
    subscriptionRef.current = subscription
    selectorRef.current = selector
    lastSnapshotRef.current = undefined
  }

  const getSnapshot = React.useCallback((): R => {
    const sel = selectorRef.current
    const next = sel ? sel(subscriptionRef.current.get()) : subscriptionRef.current.get()
    const prev = lastSnapshotRef.current
    if (prev !== undefined && deepEqual(prev, next))
      return prev
    lastSnapshotRef.current = next
    return next
  }, [])

  return React.useSyncExternalStore(subscription.subscribe, getSnapshot, getSnapshot)
}
