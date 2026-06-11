---
name: use-subscription-vue
description: >-
  Vue composable returning readonly ShallowRef.
type: framework
library: seitu
library_version: "0.15.1"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/vue/composables.mdx
  - letstri/seitu:seitu/src/vue/composables.ts
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
## Common Mistakes

### [HIGH] Destructuring the returned ref

Wrong:

```ts
const { value } = useSubscription(store)
```

Correct:

```ts
const count = useSubscription(store)
// count.value in script, count in template
```

Return value is a ShallowRef; destructuring loses reactivity.

### [MEDIUM] Passing plain getter without factory semantics

Wrong:

```ts
useSubscription(() => expensive()) // expecting re-run each access
```

Correct:

```ts
const data = useSubscription(computed(() => createStore(0)))
```

Getter form creates subscription once on first run.

### [CRITICAL] Importing from seitu/react in Vue

Wrong:

```ts
import { useSubscription } from 'seitu/react'
```

Correct:

```ts
import { useSubscription } from 'seitu/vue'
```

Vue apps must use seitu/vue composable.

## Source

`src/vue/composables.ts`