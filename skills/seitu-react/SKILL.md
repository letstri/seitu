---
name: seitu-react
description: >-
  Use Seitu reactive primitives in React with useSubscription hook and Subscription
  component. Use when integrating Seitu stores, web storage, media queries, or any
  Subscribable into React components.
---

# Seitu + React

All React bindings live in `seitu/react`. They work with any object that
implements `Subscribable<T> & Readable<T>` — stores, web storage, computed, etc.

## useSubscription

Core hook. Built on `useSyncExternalStore` for concurrent-safe reads.

### With a module-level instance

```tsx
'use client'

import { useSubscription } from 'seitu/react'
import { createWebStorageValue } from 'seitu/web'
import * as z from 'zod'

const count = createWebStorageValue({
  type: 'localStorage',
  key: 'count',
  schema: z.number(),
  defaultValue: 0,
})

export default function Counter() {
  const value = useSubscription(count)
  return <span>{value}</span>
}
```

### With a factory function (inline creation)

Pass a function to create the subscription once on mount. Useful when the
subscription depends on props/refs.

```tsx
'use client'

import { useRef } from 'react'
import { useSubscription } from 'seitu/react'
import { createScrollState } from 'seitu/web'

export default function ScrollTracker() {
  const ref = useRef<HTMLDivElement>(null)
  const state = useSubscription(() =>
    createScrollState({ element: () => ref.current, direction: 'vertical' })
  )
  return <div ref={ref}>{state.top.reached ? 'at top' : 'scrolled'}</div>
}
```

### With selector (granular re-renders)

Only re-renders when the selected value changes (deep equality by default).

```tsx
const storage = createWebStorage({
  type: 'sessionStorage',
  schemas: { count: z.number(), name: z.string() },
  defaultValues: { count: 0, name: '' },
})

function CountOnly() {
  const count = useSubscription(storage, {
    selector: v => v.count,
  })
  return <span>{count}</span>
}
```

### Options

| Option      | Type                        | Description                              |
|-------------|-----------------------------|------------------------------------------|
| `selector?` | `(value) => R`              | Derive a subset; re-render only when it changes |
| `deps?`     | `DependencyList`            | Re-create factory subscription when deps change |
| `isEqual?`  | `(prev, next) => boolean`   | Custom equality (default: `deepEqual`)   |

### With deps (re-create on prop change)

```tsx
function UserStorage({ userId }: { userId: string }) {
  const data = useSubscription(
    () => createWebStorageValue({
      type: 'localStorage',
      key: `user:${userId}`,
      schema: z.object({ name: z.string() }),
      defaultValue: { name: '' },
    }),
    { deps: [userId] },
  )
  return <span>{data.name}</span>
}
```

## Subscription component

Declarative render-prop alternative to the hook. Isolates re-renders to the
children function.

```tsx
import { Subscription } from 'seitu/react'

<Subscription value={storage}>
  {(value) => <div>{value.count}</div>}
</Subscription>

<Subscription value={storage} selector={v => v.count}>
  {(count) => <div>{count}</div>}
</Subscription>
```

## Patterns

### Store outside component, hook inside

Define stores/storages at module level (singleton). Use `useSubscription` inside
components. This keeps state alive across mounts and shareable between components.

```ts
// stores/settings.ts
export const settings = createWebStorage({ ... })

// components/Theme.tsx
import { settings } from '../stores/settings'
export function Theme() {
  const { theme } = useSubscription(settings).preferences
  // ...
}
```

### Mutating from event handlers

Call `set()` directly on the store — no need for dispatch or setState.

```tsx
function Counter() {
  const count = useSubscription(countStore)
  return <button onClick={() => countStore.set(c => c + 1)}>{count}</button>
}
```

### Async IndexedDB with ready

```tsx
const db = createIndexedDbStorage({ ... })

function App() {
  const value = useSubscription(db)
  // value is defaults until db.ready resolves, then hydrated
  return <pre>{JSON.stringify(value)}</pre>
}
```
