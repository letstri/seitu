---
name: use-subscription-svelte
description: >-
  Svelte binding returning a Readable store for any Seitu primitive.
type: framework
library: seitu
library_version: "0.16.0"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/svelte/hooks.mdx
  - letstri/seitu:seitu/src/svelte/hooks.ts
---

# useSubscription (Svelte)

Binding from `seitu/svelte`. Returns a Svelte [`Readable`](https://svelte.dev/docs/svelte-store#readable)
store that stays in sync with any `Subscribable<T> & Readable<T>`. Read it with the `$`
auto-subscription (`$value`) in markup. The source subscription is created lazily on the
first subscriber and torn down when the last one leaves (SSR-safe, auto-cleanup).

## Basic usage (module-level instance)

```svelte
<script lang="ts">
  import { useSubscription } from 'seitu/svelte'
  import { createStore } from 'seitu'

  const count = createStore(0)
  const value = useSubscription(count)
</script>

<button onclick={() => count.set(v => v + 1)}>{$value}</button>
```

## Inline subscription (factory form)

```svelte
<script lang="ts">
  import { useSubscription } from 'seitu/svelte'
  import { createWebStorageValue } from 'seitu/web'
  import * as z from 'zod'

  const value = useSubscription(() => createWebStorageValue({
    type: 'sessionStorage',
    key: 'test',
    defaultValue: 0,
    schema: z.number(),
  }))
</script>

<div>{$value}</div>
```

## With selector (granular updates)

```svelte
<script lang="ts">
  const count = useSubscription(storage, { selector: v => v.count })
</script>

<div>{$count}</div>
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `selector?` | `(value) => R` | Derive a subset; the store updates only when it changes |
| `isEqual?` | `(prev, next) => boolean` | Custom equality (default: `deepEqual`) |

## Returns

`Readable<R>` (from `svelte/store`) — read it as `$value` in markup, or with `get(value)` in scripts.

## Common Mistakes

### [CRITICAL] Reading the store without the `$` prefix

Wrong:

```svelte
<div>{value}</div>
```

Correct:

```svelte
<div>{$value}</div>
```

`useSubscription` returns a Svelte store; the `$` prefix auto-subscribes and reads the current value.

### [MEDIUM] Passing a factory expecting reactivity to a changing source

Wrong:

```svelte
<script lang="ts">
  // The factory runs once; it does not re-run when `id` changes.
  const value = useSubscription(() => createWebStorageValue({ key: `user:${id}`, ... }))
</script>
```

Correct:

```svelte
<script lang="ts">
  // Recreate via a keyed block or derive the source explicitly when it must change.
  const value = useSubscription(createWebStorageValue({ key: `user:${id}`, ... }))
</script>
```

The factory is a one-time initializer; for a source that changes over time, recreate the binding (e.g. in a `{#key}` block).

### [CRITICAL] Importing from seitu/react in Svelte

Wrong:

```ts
import { useSubscription } from 'seitu/react'
```

Correct:

```ts
import { useSubscription } from 'seitu/svelte'
```

The React hook relies on `useSyncExternalStore`; Svelte apps must use the `seitu/svelte` binding.

## Source

`src/svelte/hooks.ts`
