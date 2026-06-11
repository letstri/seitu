---
name: seitu-overview
description: >-
  Module map, mental model, decision tree, SSR — read before other Seitu skills.
type: lifecycle
library: seitu
library_version: "0.15.1"
sources:
  - letstri/seitu:docs/content/docs/index.mdx
  - letstri/seitu:seitu/src/core/index.ts
---

# Seitu Overview

Seitu is a type-safe reactive primitives library. Framework-agnostic core with
React and Vue bindings. Every primitive shares the same `get()` / `subscribe()`
API — no actions, no reducers, no context providers.

## Module map

| Import path | Purpose |
|-------------|---------|
| `seitu` | Core stores, computed, debounce/throttle |
| `seitu/web` | Browser persistence (localStorage, sessionStorage, IndexedDB) and DOM state |
| `seitu/react` | `useSubscription` hook + `Subscription` component |
| `seitu/vue` | `useSubscription` composable |
| `seitu/utils` | Helpers (`repairValueObjectWithDefault`) |

ESM-only. Node >= 22. React >= 19 and Vue >= 3.5 are optional peer deps.

## Mental model

All primitives implement a consistent interface:

| Interface | Methods |
|-----------|---------|
| `Readable<T>` | `get(): T` |
| `Subscribable<T>` | `subscribe(cb, opts?) → unsub` |
| `Writable<T>` | `set(value \| updater)` |
| `Clearable` | `clear()` |

`subscribe` accepts `{ immediate?: boolean }` to fire the callback with the current value on subscribe.

## Composition pattern

1. **Create** the primitive at module level (singleton).
2. **Subscribe** in a component via `useSubscription` (React/Vue).
3. **Mutate** directly from event handlers with `.set()` — no dispatch layer.

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

```tsx
// components/Theme.tsx
'use client'
import { useSubscription } from 'seitu/react'
import { settings } from '../stores/settings'

export function Theme() {
  const { theme } = useSubscription(settings)
  return (
    <button onClick={() => settings.set({ theme: theme === 'light' ? 'dark' : 'light' })}>
      {theme}
    </button>
  )
}
```

## Decision tree

```
What do you need?
│
├─ In-memory state
│  ├─ Simple value → createStore
│  ├─ Schema-validated → createSchemaStore
│  └─ Derived from other sources → createComputed
│
├─ Browser persistence
│  ├─ Single key → createWebStorageValue
│  ├─ Multiple keys → createWebStorage
│  └─ Large/async data → createIndexedDbStorage
│
├─ DOM / browser APIs
│  ├─ CSS media query → createMediaQuery
│  ├─ Online/offline → createIsOnline
│  └─ Scroll position → createScrollState
│
├─ Rate limiting
│  ├─ On a subscribable → createDebounced / createThrottled
│  └─ On a function → createDebouncedFn / createThrottledFn
│
└─ Framework integration
   ├─ React → useSubscription (hook) or Subscription (component)
   └─ Vue → useSubscription (composable)
```

## Framework binding

One hook/composable works with **any** Seitu primitive — stores, web storage,
computed, media queries, scroll state, etc.

```tsx
// React — instance or factory
const value = useSubscription(store)
const scroll = useSubscription(() => createScrollState({ element: () => ref.current }))
const count = useSubscription(storage, { selector: v => v.count })
```

```vue
// Vue — instance, ref, or getter
const value = useSubscription(store)
const data = useSubscription(computed(() => createWebStorageValue({ ... })))
```

## SSR

All `seitu/web` primitives return defaults when `window` / `navigator` is
undefined. Safe to create at module level in SSR frameworks (Next.js, Nuxt).
Use `defaultMatches` on `createMediaQuery` for SSR-specific defaults.

## Validation & repair

Storage primitives accept Standard Schema validators (Zod, Valibot, ArkType).
On invalid stored data, they fall back to `defaultValue`. Use `onValidationError`
to intercept and repair:

```ts
import { repairValueObjectWithDefault } from 'seitu/utils'

const settings = createWebStorageValue({
  type: 'localStorage',
  key: 'settings',
  schema: z.object({ a: z.number(), b: z.string() }),
  defaultValue: { a: 0, b: 'default' },
  onValidationError: repairValueObjectWithDefault,
})
```

## Per-function skills

Each exported function has a dedicated skill in `skills/<slug>/SKILL.md` (lowercase-hyphen slug, e.g. `create-store`).
Read the overview first, then the specific skill for the function you need.
## Common Mistakes

### [HIGH] Using useState for shared module-level state

Wrong:

```ts
function Counter() {
  const [count, setCount] = useState(0)
}
```

Correct:

```ts
const count = createStore(0)
function Counter() {
  const value = useSubscription(count)
}
```

Seitu primitives are singletons at module scope; useState resets per component instance.

### [MEDIUM] Importing seitu/react in non-React code

Wrong:

```ts
import { useSubscription } from 'seitu/react'
count.subscribe(console.log)
```

Correct:

```ts
import { createStore } from 'seitu'
const count = createStore(0)
count.subscribe(console.log)
```

React bindings are optional peer deps; core and web work without React.

### [HIGH] Expecting actions or reducers

Wrong:

```ts
store.dispatch({ type: 'increment' })
```

Correct:

```ts
store.set(v => v + 1)
```

Seitu has no dispatch layer — mutate with .set() directly.

## See also

- [`create-web-storage-value`](../create-web-storage-value/SKILL.md) — Decision tree routes persistence tasks to web storage skills.

## Source

`src/core/index.ts`