---
name: useSubscription-vue
description: >-
  Vue 3 composable to subscribe to any Seitu reactive value. Returns a readonly
  ShallowRef. Use when integrating Seitu into Vue components.
---

# useSubscription (Vue)

Vue 3 composable from `seitu/vue`. Returns a readonly `ShallowRef<T>` that stays in sync with the source. Accepts a raw instance, a `ref`, or a getter.

## Basic usage

```vue
<script setup lang="ts">
import { createWebStorageValue } from 'seitu/web'
import { useSubscription } from 'seitu/vue'
import * as z from 'zod'

const count = createWebStorageValue({
  type: 'localStorage',
  key: 'count',
  schema: z.number(),
  defaultValue: 0,
})

const value = useSubscription(count)
</script>

<template>
  <span>{{ value }}</span>
</template>
```

## With reactive source (auto re-subscribes)

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { createWebStorageValue } from 'seitu/web'
import { useSubscription } from 'seitu/vue'
import * as z from 'zod'

const userId = ref('user-1')
const storage = computed(() =>
  createWebStorageValue({
    type: 'localStorage',
    key: `user:${userId.value}`,
    schema: z.object({ name: z.string() }),
    defaultValue: { name: '' },
  })
)

const data = useSubscription(storage)
</script>
```

## With selector

```vue
<script setup lang="ts">
const count = useSubscription(storage, { selector: v => v.count })
</script>
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `selector?` | `(value) => R` | Derive subset; update ref only when it changes |
| `isEqual?` | `(prev, next) => boolean` | Custom equality (default: `deepEqual`) |

## Source

`seitu/src/vue/composables.ts`
