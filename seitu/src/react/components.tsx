import type { Readable, Subscribable } from '../core'
import type { UseSubscriptionOptions } from './hooks'
import { useSubscription } from './hooks'

export interface SubscriptionProps<S extends Subscribable<any> & Readable<any>, R = S['~']['output']> extends Pick<UseSubscriptionOptions<S, R>, 'selector'> {
  value: S
  children: (value: R) => React.ReactNode
}

/**
 * Declarative component that subscribes to a reactive value and passes it to a render function.
 * Re-renders when the value (or selected value) changes. Use when you prefer a component API
 * over the useSubscription hook.
 *
 * @example Basic usage
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { createSessionStorage } from 'seitu/web'
 * import { Subscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = createSessionStorage({
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
 * import { createSessionStorage } from 'seitu/web'
 * import { Subscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = createSessionStorage({
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
export function Subscription<S extends Subscribable<any> & Readable<any>, R = S['~']['output']>({
  value,
  selector,
  children,
}: SubscriptionProps<S, R>) {
  const v = useSubscription(value, { selector })

  return children(v)
}
