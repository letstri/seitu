---
name: use-subscription-react
description: >-
  React hook for any Seitu primitive via useSyncExternalStore.
type: framework
library: seitu
library_version: "0.15.1"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/react/hooks.mdx
  - letstri/seitu:seitu/src/react/hooks.ts
---

# useSubscription (React)

Core React hook from `seitu/react`. Built on `useSyncExternalStore` for concurrent-safe reads. Works with any `Subscribable<T> & Readable<T>`.

## Basic usage (module-level instance)

```tsx
'use client'
import { useSubscription } from 'seitu/react'
import { createStore } from 'seitu'

const count = createStore(0)

function Counter() {
  const value = useSubscription(count)
  return <button onClick={() => count.set(v => v + 1)}>{value}</button>
}
```

## Factory function (inline creation)

```tsx
'use client'
import { useSubscription } from 'seitu/react'
import { createScrollState } from 'seitu/web'
import { useRef } from 'react'

function ScrollTracker() {
  const ref = useRef<HTMLDivElement>(null)
  const state = useSubscription(() =>
    createScrollState({ element: () => ref.current, direction: 'vertical' })
  )
  return <div ref={ref}>{state.top.reached ? 'at top' : 'scrolled'}</div>
}
```

## With selector (granular re-renders)

```tsx
const count = useSubscription(storage, { selector: v => v.count })
```

## With deps (re-create on prop change)

```tsx
function UserStorage({ userId }: { userId: string }) {
  const data = useSubscription(
    () => createWebStorageValue({ type: 'localStorage', key: `user:${userId}`, schema, defaultValue }),
    { deps: [userId] },
  )
}
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `selector?` | `(value) => R` | Derive subset; re-render only when it changes |
| `deps?` | `DependencyList` | Re-create factory subscription when deps change |
| `isEqual?` | `(prev, next) => boolean` | Custom equality (default: `deepEqual`) |
## Common Mistakes

### [CRITICAL] Missing use client directive

Wrong:

```ts
export default function Page() {
  const v = useSubscription(store)
}
```

Correct:

```ts
'use client'
export default function Page() {
  const v = useSubscription(store)
}
```

Hook uses client-only APIs; fails in RSC server components.

### [CRITICAL] Factory without deps when props change

Wrong:

```ts
useSubscription(() => createWebStorageValue({ key: userId, ... }))
```

Correct:

```ts
useSubscription(() => createWebStorageValue({ key: userId, ... }), { deps: [userId] })
```

Factory runs once unless deps array changes.

### [HIGH] Using useEffect to subscribe manually

Wrong:

```ts
useEffect(() => store.subscribe(setV), [])
```

Correct:

```ts
const v = useSubscription(store)
```

useSubscription handles subscribe/unsubscribe and concurrent safety.

## See also

- [`create-scroll-state`](../create-scroll-state/SKILL.md) — Scroll tracking requires factory + ref pattern in React.

## Source

`src/react/hooks.ts`