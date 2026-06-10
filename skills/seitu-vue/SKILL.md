---
name: seitu-vue
description: >-
  Use Seitu reactive primitives in Vue 3 with the useSubscription composable.
  Use when integrating Seitu stores, web storage, media queries, or any
  Subscribable into Vue components.
---

# Seitu + Vue

All Vue bindings live in `seitu/vue`. They work with any object that
implements `Subscribable<T> & Readable<T>`.

## useSubscription

Returns a readonly `ShallowRef<T>` that stays in sync with the source.
Accepts a raw instance, a `ref`, or a getter.

### Basic usage

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

### With a reactive source (ref / getter)

When the source changes, the composable re-subscribes automatically.

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

<template>
  <span>{{ data.name }}</span>
</template>
```

### With selector

```vue
<script setup lang="ts">
import { createWebStorage } from 'seitu/web'
import { useSubscription } from 'seitu/vue'
import * as z from 'zod'

const storage = createWebStorage({
  type: 'sessionStorage',
  schemas: { count: z.number(), name: z.string() },
  defaultValues: { count: 0, name: '' },
})

const count = useSubscription(storage, { selector: v => v.count })
</script>

<template>
  <span>{{ count }}</span>
</template>
```

### Options

| Option      | Type                        | Description                              |
|-------------|-----------------------------|------------------------------------------|
| `selector?` | `(value) => R`              | Derive a subset; update ref only when it changes |
| `isEqual?`  | `(prev, next) => boolean`   | Custom equality (default: `deepEqual`)   |

## Patterns

### Module-level store, composable inside

```ts
// stores/settings.ts
import { createWebStorage } from 'seitu/web'
import * as z from 'zod'

export const settings = createWebStorage({
  type: 'localStorage',
  schemas: { theme: z.enum(['light', 'dark']) },
  defaultValues: { theme: 'light' },
})
```

```vue
<script setup lang="ts">
import { settings } from '../stores/settings'
import { useSubscription } from 'seitu/vue'

const value = useSubscription(settings)
</script>

<template>
  <span>{{ value.theme }}</span>
  <button @click="settings.set({ theme: 'dark' })">Dark</button>
</template>
```

### Mutating from template

Call `set()` on the store directly — no actions or mutations layer needed.

```vue
<template>
  <button @click="counterStore.set(c => c + 1)">+1</button>
</template>
```
