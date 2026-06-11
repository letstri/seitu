import type { Accessor, JSX } from 'solid-js'
import type { Readable, Subscribable } from '../core/index'
import type { UseSubscriptionOptions } from './hooks'
import { useSubscription } from './hooks'

export interface SubscriptionProps<S extends Subscribable<any> & Readable<any>, R = S['~']['output']> extends Pick<UseSubscriptionOptions<S, R>, 'selector'> {
  value: S
  children: (value: Accessor<R>) => JSX.Element
}

/**
 * Declarative component that subscribes to a reactive value and passes an accessor to a render function.
 * Unlike React, the children function runs once and receives a Solid `Accessor<R>` — call it (`value()`)
 * inside the returned JSX so updates stay fine-grained. Use when you prefer a component API over the
 * useSubscription primitive.
 *
 * @example Basic usage
 * ```tsx
 * import { createWebStorage } from 'seitu/web'
 * import { Subscription } from 'seitu/solid'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * function Page() {
 *   return (
 *     <Subscription value={sessionStorage}>
 *       {value => <div>{value().count}</div>}
 *     </Subscription>
 *   )
 * }
 * ```
 *
 * @example With selector
 * ```tsx
 * import { createWebStorage } from 'seitu/web'
 * import { Subscription } from 'seitu/solid'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * function Page() {
 *   return (
 *     <Subscription value={sessionStorage} selector={v => v.count}>
 *       {count => <div>{count()}</div>}
 *     </Subscription>
 *   )
 * }
 * ```
 */
export function Subscription<S extends Subscribable<any> & Readable<any>, R = S['~']['output']>(
  props: SubscriptionProps<S, R>,
): JSX.Element {
  const value = useSubscription<S, R>(() => props.value, { selector: props.selector })

  return props.children(value)
}
