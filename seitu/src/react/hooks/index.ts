import { deepEqual } from 'fast-equals'
import * as React from 'react'

import type { Readable, Subscribable } from '../../core'

export interface UseSubscriptionOptions<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
> {
  selector?: (value: S['~']['output']) => R
  deps?: React.DependencyList
  isEqual?: (prev: R, next: R) => boolean
}

const UNSET = Symbol('seitu.unset')

interface Cell<S extends Subscribable<any> & Readable<any>, R> {
  subscription: S
  selector: ((value: S['~']['output']) => R) | undefined
  isEqual: (prev: R, next: R) => boolean
  version: number
  snapshotVersion: number
  raw: unknown
  snapshotSelector: ((value: S['~']['output']) => R) | undefined
  snapshot: R | typeof UNSET
  server: { value: R } | undefined
}

/**
 * Subscribe to a reactive value. Pass a handle or a factory (run once; recreated
 * when `deps` change).
 *
 * Sources with `getServer` (every `seitu/web` handle) use it for SSR and
 * hydration; others use `get()`. `getSnapshot` skips selector/equality when
 * source, selector, and version are unchanged — keep `selector` stable.
 * Factories run during render (twice under StrictMode); keep them cheap and
 * create long-lived resources at module scope.
 *
 * @example Inline subscription
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import { createWebStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * export default function Page() {
 *   const value = useSubscription(() => createWebStorageValue({
 *     type: 'sessionStorage',
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
 * import { createWebStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
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
 * import { createWebStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
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
 * export default function Page() {
 *   // Re-renders only when count changes
 *   const count = useSubscription(sessionStorage, { selector: value => value.count })
 *
 *   return <div>{count}</div>
 * }
 * ```
 *
 * @example Element from a callback ref
 * ```tsx twoslash title="/app/page.tsx"
 * 'use client'
 *
 * import * as React from 'react'
 * import { createScrollState } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 *
 * export default function Page() {
 *   // A callback ref plus `deps` rebuilds the subscription when the element
 *   // mounts, unmounts, or remounts. `() => ref.current` would bind once and
 *   // miss later elements.
 *   const [el, setEl] = React.useState<HTMLDivElement | null>(null)
 *   const state = useSubscription(
 *     () => createScrollState({ element: el, direction: 'vertical' }),
 *     { deps: [el] }
 *   )
 *
 *   return (
 *     <div ref={setEl}>
 *       {String(state.top.reached)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSubscription<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
>(source: S | (() => S), options?: UseSubscriptionOptions<S, R>): R {
  const { selector, deps = [], isEqual = deepEqual } = options ?? {}
  const isFactory = typeof source === 'function'

  const subscription = React.useMemo(
    () => (isFactory ? source() : source),
    [isFactory ? undefined : source, ...deps]
  )

  // One ref for values that must survive renders.
  const cell = React.useRef<Cell<S, R> | null>(null)
  const c = (cell.current ??= {
    subscription,
    selector,
    isEqual,
    version: 0,
    snapshotVersion: -1,
    raw: UNSET,
    snapshotSelector: undefined,
    snapshot: UNSET,
    server: undefined,
  })
  if (c.subscription !== subscription) {
    c.subscription = subscription
    c.raw = UNSET
    c.snapshot = UNSET
    c.server = undefined
  }
  c.selector = selector
  c.isEqual = isEqual

  const getSnapshot = React.useCallback((): R => {
    const raw = c.subscription.get()
    const sel = c.selector

    if (
      c.snapshot !== UNSET &&
      raw === c.raw &&
      sel === c.snapshotSelector &&
      c.version === c.snapshotVersion
    ) {
      return c.snapshot
    }

    const next = sel ? sel(raw) : (raw as R)
    c.raw = raw
    c.snapshotSelector = sel
    c.snapshotVersion = c.version

    if (c.snapshot !== UNSET && c.isEqual(c.snapshot, next)) {
      return c.snapshot
    }

    c.snapshot = next
    return next
  }, [c])

  // Cache server snapshot so SSR and hydration share the same reference.
  const getServerSnapshot = React.useCallback((): R => {
    const serverGet = c.subscription.getServer
    if (!serverGet) {
      return getSnapshot()
    }

    if (c.server === undefined) {
      const raw = serverGet()
      c.server = { value: c.selector ? c.selector(raw) : (raw as R) }
    }
    return c.server.value
  }, [c, getSnapshot])

  const subscribe = React.useCallback(
    (onStoreChange: () => void) =>
      subscription.subscribe(() => {
        // Invalidate the fast path even when the source mutates in place.
        c.version++
        onStoreChange()
      }),
    [c, subscription]
  )

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
