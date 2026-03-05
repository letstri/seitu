import type { Readable, Subscribable } from '../core/index'
import deepEqual from 'deep-equal'
import * as React from 'react'

/**
 * Use this hook to subscribe to a reactive value. Accepts a subscription object
 * directly, or a factory function that is called only once on first render —
 * subsequent renders reuse the cached subscription unless dependency array changes.
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
 *   const { value: count } = useSubscription(sessionStorage, { selector: value => value.count })
 *
 *   return <div>{count}</div>
 * }
 * ```
 *
 * @param source - A reactive subscription object, or a factory function returning one.
 * @param options - Optional configuration object.
 * @param options.selector - Optional selection function to derive value.
 * @param options.deps - Optional dependencies to force memoization of subscription (recreate on change).
 */
export function useSubscription<
  Props extends { ref: unknown | null } = { ref: unknown | null },
  S extends Subscribable<any> & Readable<any> = Subscribable<any> & Readable<any>,
  R = S['~']['output'],
>(
  source: S | ((props: { ref: Props['ref'] }) => S),
  options?: {
    selector?: (value: S['~']['output']) => R
    deps?: React.DependencyList
  },
): { value: R, ref: React.RefCallback<Props['ref']> } {
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

  const [ref, setRef] = React.useState<Props['ref'] | null>(null)

  const factoryFn = isFactory ? source : () => source
  const factoryRef = React.useRef(factoryFn)
  factoryRef.current = factoryFn

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subscription = React.useMemo(() => factoryRef.current({ ref }), [ref, ...deps])

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

  return { value, ref: setRef }
}
