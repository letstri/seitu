---
name: useSubscription-react
description: >-
  React hook to subscribe to any Seitu reactive value. Built on useSyncExternalStore
  for concurrent-safe reads. Use when integrating Seitu into React components.
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

## Source

`seitu/src/react/hooks.ts`
