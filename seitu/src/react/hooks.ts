import type { Readable, Subscribable } from '../core/index'
import deepEqual from 'deep-equal'
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
 * import { scrollState } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * export default function Page() {
 *   const [ref, setRef] = React.useState<HTMLDivElement | null>(null)
 *   const state = useSubscription(() => scrollState({ element: ref, direction: 'vertical' }), { deps: [ref] })
 *
 *   return (
 *     <div ref={setRef}>
 *       {String(state.top.value)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSubscription<
  S extends Subscribable<any> & Readable<any> = Subscribable<any> & Readable<any>,
  R = S['~']['output'],
>(
  source: S | (() => S),
  options?: UseSubscriptionOptions<S, R>,
): R {
  const { selector, deps = [] } = options ?? {}
  const isFactory = typeof source === 'function'

  const sourceRef = React.useRef(source)
  if (!isFactory && source !== sourceRef.current) {
    throw new Error(
      'useSubscription detected a new object on re-render. '
      + 'Either create the subscription outside the component or wrap it in a factory: '
      + 'useSubscription(() => yourSubscription(...))',
    )
  }
  sourceRef.current = source

  const factoryFn = isFactory ? source : () => source
  const factoryRef = React.useRef(factoryFn)
  factoryRef.current = factoryFn

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subscription = React.useMemo(() => factoryRef.current(), deps)

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
