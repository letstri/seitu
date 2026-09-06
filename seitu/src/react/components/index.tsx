import type { Readable, Subscribable } from '../../core'
import type { UseSubscriptionOptions } from '../hooks'
import { useSubscription } from '../hooks'

export interface SubscriptionProps<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
> extends Pick<UseSubscriptionOptions<S, R>, 'selector'> {
  value: S
  children: (value: R) => React.ReactNode
}

/**
 * Subscribes to a value and passes it to `children`. Prefer over the hook when
 * you want a component API.
 *
 * @example Basic usage
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { createWebStorage } from 'seitu/web'
 * import { Subscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * export default function Page() {
 *   return (
 *     <Subscription value={sessionStorage}>
 *       {(value) => <div>{value.count}</div>}
 *     </Subscription>
 *   )
 * }
 * ```
 *
 * @example With selector
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { createWebStorage } from 'seitu/web'
 * import { Subscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * export default function Page() {
 *   return (
 *     <Subscription value={sessionStorage} selector={(v) => v.count}>
 *       {(count) => <div>{count}</div>}
 *     </Subscription>
 *   )
 * }
 * ```
 */
export function Subscription<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
>({ value, selector, children }: SubscriptionProps<S, R>) {
  const v = useSubscription(value, { selector })

  return children(v)
}
