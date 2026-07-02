# React (seitu/react)

## useSubscription

Core React hook from `seitu/react`. Built on `useSyncExternalStore` for concurrent-safe reads. Works with any `Subscribable<T> & Readable<T>`.

### Basic usage (module-level instance)

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

### Factory function (inline creation)

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

### With selector (granular re-renders)

```tsx
const count = useSubscription(storage, { selector: v => v.count })
```

### With deps (re-create on prop change)

```tsx
function UserStorage({ userId }: { userId: string }) {
  const data = useSubscription(
    () => createWebStorageValue({ type: 'localStorage', key: `user:${userId}`, schema, defaultValue }),
    { deps: [userId] },
  )
}
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `selector?` | `(value) => R` | Derive subset; re-render only when it changes |
| `deps?` | `DependencyList` | Re-create factory subscription when deps change |
| `isEqual?` | `(prev, next) => boolean` | Custom equality (default: `deepEqual`) |

## Subscription (render-prop component)

Declarative render-prop component from `seitu/react`. Isolates re-renders to the children function.

```tsx
import { Subscription } from 'seitu/react'

<Subscription value={storage}>
  {(value) => <div>{value.count}</div>}
</Subscription>

<Subscription value={storage} selector={v => v.count}>
  {(count) => <div>{count}</div>}
</Subscription>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `Subscribable & Readable` | The reactive source |
| `selector?` | `(value) => R` | Optional selector for granular updates |
| `children` | `(value) => ReactNode` | Render function |

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

Hook (and the `Subscription` component, which uses it internally) uses client-only APIs; fails in RSC server components.

### [CRITICAL] Factory without deps when props change

Wrong:

```ts
useSubscription(() => createWebStorageValue({ key: userId, ... }))
```

Correct:

```ts
useSubscription(() => createWebStorageValue({ key: userId, ... }), { deps: [userId] })
```

Factory runs once unless deps array changes. Same applies to a `Subscription` inline source — key it or pass deps.

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

### [LOW] Preferring component over hook without reason

Wrong:

```ts
<Subscription source={s}>{v => <Child value={v} />}</Subscription>
```

Correct:

```ts
const v = useSubscription(s); return <Child value={v} />
```

useSubscription is simpler for most cases; Subscription is for render-prop composition (isolating re-renders to a subtree).

## See also

- [`create-scroll-state`](create-scroll-state.md) — Scroll tracking requires factory + ref pattern in React.

## Source

`src/react/hooks.ts`, `src/react/components.tsx`
