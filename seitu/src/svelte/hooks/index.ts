import { deepEqual } from 'fast-equals'
import type { Readable as SvelteReadable } from 'svelte/store'
import { readable } from 'svelte/store'

import type { Readable, Subscribable } from '../../core'

export interface UseSubscriptionOptions<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
> {
  selector?: (value: S['~']['output']) => R
  isEqual?: (prev: R, next: R) => boolean
}

/**
 * Subscribe to a reactive value from a Svelte component. Pass a handle or a
 * factory (run once). Returns a Svelte `Readable` (`$value`); it attaches on
 * first subscriber and detaches on last.
 *
 * @example Inline subscription
 * ```svelte
 * <script lang="ts">
 *   import { createWebStorageValue } from 'seitu/web'
 *   import { useSubscription } from 'seitu/svelte'
 *   import * as z from 'zod'
 *
 *   const value = useSubscription(() => createWebStorageValue({
 *     type: 'sessionStorage',
 *     key: 'test',
 *     defaultValue: 0,
 *     schema: z.number(),
 *   }))
 * </script>
 *
 * <div>{$value}</div>
 * ```
 *
 * @example Instance outside of component
 * ```svelte
 * <script lang="ts">
 *   import { createWebStorage } from 'seitu/web'
 *   import { useSubscription } from 'seitu/svelte'
 *   import * as z from 'zod'
 *
 *   const sessionStorage = createWebStorage({
 *     type: 'sessionStorage',
 *     schemas: { count: z.number(), name: z.string() },
 *     defaultValues: { count: 0, name: '' },
 *   })
 *
 *   const value = useSubscription(sessionStorage)
 * </script>
 *
 * <div>{$value.count}</div>
 * ```
 *
 * @example With selector
 * ```svelte
 * <script lang="ts">
 *   import { createWebStorage } from 'seitu/web'
 *   import { useSubscription } from 'seitu/svelte'
 *   import * as z from 'zod'
 *
 *   const sessionStorage = createWebStorage({
 *     type: 'sessionStorage',
 *     schemas: { count: z.number(), name: z.string() },
 *     defaultValues: { count: 0, name: '' },
 *   })
 *
 *   // Updates only when `count` changes
 *   const count = useSubscription(sessionStorage, { selector: v => v.count })
 * </script>
 *
 * <div>{$count}</div>
 * ```
 */
export function useSubscription<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
>(
  source: S | (() => S),
  options?: UseSubscriptionOptions<S, R>
): SvelteReadable<R> {
  const { selector, isEqual = deepEqual } = options ?? {}
  const sub = (typeof source === 'function' ? source() : source) as S

  function getSnapshot(): R {
    return selector ? selector(sub.get()) : sub.get()
  }

  const initial = getSnapshot()

  return readable(initial, (set) => {
    let current = initial

    function refresh(): void {
      const next = getSnapshot()
      if (!isEqual(current, next)) {
        current = next
        set(next)
      }
    }

    // Re-read in case the value changed before the first subscriber.
    refresh()

    return sub.subscribe(refresh)
  })
}
