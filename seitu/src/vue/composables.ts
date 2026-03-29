import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import type { Readable, Subscribable } from '../core/index'
import { deepEqual } from 'fast-equals'
import { computed, onWatcherCleanup, readonly, shallowRef, toValue, watch } from 'vue'

export interface UseSubscriptionOptions<S extends Subscribable<any> & Readable<any>, R = S['~']['output']> {
  selector?: (value: S['~']['output']) => R
}

/**
 * Use this composable to subscribe to a reactive value. Accepts a subscription object
 * directly or a ref/getter that returns one.
 *
 * @example Inline subscription
 * ```vue
 * <script setup lang="ts">
 * import { createSessionStorageValue } from 'seitu/web'
 * import { useSubscription } from 'seitu/vue'
 * import * as z from 'zod'
 *
 * const value = useSubscription(
 *   createSessionStorageValue({ key: 'test', defaultValue: 0, schema: z.number() }),
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
 * import { createSessionStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/vue'
 * import * as z from 'zod'
 *
 * const sessionStorage = createSessionStorage({
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
 * import { createSessionStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/vue'
 * import * as z from 'zod'
 *
 * const sessionStorage = createSessionStorage({
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
  options?: UseSubscriptionOptions<S, R>,
): Readonly<ShallowRef<R>> {
  const { selector } = options ?? {}

  function getSnapshot(sub: S): R {
    return selector ? selector(sub.get()) : sub.get()
  }

  const sub = computed(() => toValue(source))
  const state = shallowRef(getSnapshot(sub.value)) as ShallowRef<R>

  watch(
    sub,
    (sub) => {
      state.value = getSnapshot(sub)

      const unsubscribe = sub.subscribe(() => {
        const next = getSnapshot(sub)
        if (!deepEqual(state.value, next)) {
          state.value = next
        }
      })

      onWatcherCleanup(() => {
        unsubscribe()
      })
    },
    { immediate: true },
  )

  return readonly(state) as Readonly<ShallowRef<R>>
}
