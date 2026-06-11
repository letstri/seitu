import type { Accessor } from 'solid-js'
import type { Readable, Subscribable } from '../core/index'
import { deepEqual } from 'fast-equals'
import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

export interface UseSubscriptionOptions<S extends Subscribable<any> & Readable<any>, R = S['~']['output']> {
  selector?: (value: S['~']['output']) => R
  isEqual?: (prev: R, next: R) => boolean
}

/**
 * Use this primitive to subscribe to a reactive value. Accepts a subscription object
 * directly, or an accessor/getter that returns one. The getter is reactive — when it
 * reads a signal, the subscription is recreated and re-subscribed automatically.
 *
 * Returns a Solid `Accessor<R>`: call it (`value()`) to read the current value inside JSX
 * or another reactive scope.
 *
 * @example Inline subscription
 * ```tsx
 * import { createWebStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/solid'
 * import * as z from 'zod'
 *
 * function Counter() {
 *   const value = useSubscription(() => createWebStorageValue({
 *     type: 'sessionStorage',
 *     key: 'test',
 *     defaultValue: 0,
 *     schema: z.number(),
 *   }))
 *
 *   return <div>{value()}</div>
 * }
 * ```
 *
 * @example Instance outside of component
 * ```tsx
 * import { createWebStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/solid'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * function Counter() {
 *   const value = useSubscription(sessionStorage)
 *   return <div>{value().count}</div>
 * }
 * ```
 *
 * @example Subscription with selector
 * ```tsx
 * import { createWebStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/solid'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: {
 *     count: z.number(),
 *     name: z.string(),
 *   },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * function Counter() {
 *   // Usage with selector, the accessor only updates when count changes
 *   const count = useSubscription(sessionStorage, { selector: value => value.count })
 *
 *   return <div>{count()}</div>
 * }
 * ```
 *
 * @example Reactive source (re-subscribes when a signal changes)
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { createWebStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/solid'
 * import * as z from 'zod'
 *
 * function User() {
 *   const [userId, setUserId] = createSignal('user-1')
 *   const data = useSubscription(() => createWebStorageValue({
 *     type: 'localStorage',
 *     key: `user:${userId()}`,
 *     schema: z.object({ name: z.string() }),
 *     defaultValue: { name: '' },
 *   }))
 *
 *   return <div>{data().name}</div>
 * }
 * ```
 *
 * @example Ref example
 * ```tsx
 * import { createScrollState } from 'seitu/web'
 * import { useSubscription } from 'seitu/solid'
 *
 * function Page() {
 *   let ref: HTMLDivElement | undefined
 *   const state = useSubscription(() => createScrollState({ element: () => ref, direction: 'vertical' }))
 *
 *   return (
 *     <div ref={ref}>
 *       {String(state().top.reached)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSubscription<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
>(
  source: S | Accessor<S>,
  options?: UseSubscriptionOptions<S, R>,
): Accessor<R> {
  const { selector, isEqual = deepEqual } = options ?? {}
  const getSource = (typeof source === 'function' ? source : () => source) as Accessor<S>

  function getSnapshot(sub: S): R {
    return selector ? selector(sub.get()) : sub.get()
  }

  const sub = createMemo(() => getSource())
  const [state, setState] = createSignal<R>(getSnapshot(sub()), { equals: isEqual })

  createEffect(() => {
    const current = sub()
    setState(() => getSnapshot(current))

    const unsubscribe = current.subscribe(() => {
      setState(() => getSnapshot(current))
    })

    onCleanup(unsubscribe)
  })

  return state
}
