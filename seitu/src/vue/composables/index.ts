import { deepEqual } from 'fast-equals'
import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import {
  computed,
  onWatcherCleanup,
  shallowReadonly,
  shallowRef,
  toValue,
  watch,
} from 'vue'

import type { Readable, Subscribable } from '../../core'

export interface UseSubscriptionOptions<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
> {
  selector?: (value: S['~']['output']) => R
  isEqual?: (prev: R, next: R) => boolean
}

/**
 * Subscribe to a reactive value. Pass a handle or a ref/getter that returns one.
 *
 * @example Inline subscription
 * ```vue
 * <script setup lang="ts">
 * import { createWebStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/vue'
 * import * as z from 'zod'
 *
 * const value = useSubscription(
 *   createWebStorageValue({ type: 'sessionStorage', key: 'test', defaultValue: 0, schema: z.number() }),
 * )
 * </script>
 *
 * <template>
 *   <div>{{ value }}</div>
 * </template>
 * ```
 *
 * @example Instance outside of the subscription
 * ```vue
 * <script setup lang="ts">
 * import { createWebStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/vue'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * const value = useSubscription(sessionStorage)
 * </script>
 *
 * <template>
 *   <div>{{ value.count }}</div>
 * </template>
 * ```
 *
 * @example With selector
 * ```vue
 * <script setup lang="ts">
 * import { createWebStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/vue'
 * import * as z from 'zod'
 *
 * const sessionStorage = createWebStorage({
 *   type: 'sessionStorage',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * const count = useSubscription(sessionStorage, { selector: v => v.count })
 * </script>
 *
 * <template>
 *   <div>{{ count }}</div>
 * </template>
 * ```
 */
export function useSubscription<
  S extends Subscribable<any> & Readable<any>,
  R = S['~']['output'],
>(
  source: MaybeRefOrGetter<S>,
  options?: UseSubscriptionOptions<S, R>
): Readonly<ShallowRef<R>> {
  const { selector, isEqual = deepEqual } = options ?? {}

  function getSnapshot(sub: S): R {
    return selector ? selector(sub.get()) : sub.get()
  }

  const sub = computed(() => toValue(source))
  const state = shallowRef() as ShallowRef<R>

  watch(
    sub,
    (sub) => {
      state.value = getSnapshot(sub)

      onWatcherCleanup(
        sub.subscribe(() => {
          const next = getSnapshot(sub)
          if (!isEqual(state.value, next)) {
            state.value = next
          }
        })
      )
    },
    { immediate: true }
  )

  return shallowReadonly(state) as Readonly<ShallowRef<R>>
}
