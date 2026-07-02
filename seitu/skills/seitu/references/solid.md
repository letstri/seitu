# Solid (seitu/solid)

## useSubscription

Core Solid primitive from `seitu/solid`. Returns a Solid `Accessor<T>` (`() => T`) that stays in sync with the source. Works with any `Subscribable<T> & Readable<T>`. Accepts a raw instance or a reactive getter.

### Basic usage (module-level instance)

```tsx
import { useSubscription } from 'seitu/solid'
import { createStore } from 'seitu'

const count = createStore(0)

function Counter() {
  const value = useSubscription(count)
  return <button onClick={() => count.set(v => v + 1)}>{value()}</button>
}
```

### Inline subscription (getter form)

```tsx
import { useSubscription } from 'seitu/solid'
import { createScrollState } from 'seitu/web'

function ScrollTracker() {
  let ref: HTMLDivElement | undefined
  const state = useSubscription(() =>
    createScrollState({ element: () => ref, direction: 'vertical' })
  )
  return <div ref={ref}>{state().top.reached ? 'at top' : 'scrolled'}</div>
}
```

### Reactive source (re-subscribes when a signal changes)

```tsx
import { createSignal } from 'solid-js'
import { useSubscription } from 'seitu/solid'
import { createWebStorageValue } from 'seitu/web'

function UserStorage(props: { userId: string }) {
  const data = useSubscription(() =>
    createWebStorageValue({ type: 'localStorage', key: `user:${props.userId}`, schema, defaultValue })
  )
  return <div>{data().name}</div>
}
```

### With selector (granular updates)

```tsx
const count = useSubscription(storage, { selector: v => v.count })
// count() only changes when the selected value changes
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `selector?` | `(value) => R` | Derive subset; the accessor updates only when it changes |
| `isEqual?` | `(prev, next) => boolean` | Custom equality (default: `deepEqual`) |

### Returns

`Accessor<R>` — a getter function. Read it with `value()` inside JSX or any tracked scope.

## Subscription (render-prop component)

Declarative render-prop component from `seitu/solid`. The children function runs once and
receives a Solid `Accessor<R>` — read it with `value()` so updates stay fine-grained.

```tsx
import { Subscription } from 'seitu/solid'

<Subscription value={storage}>
  {value => <div>{value().count}</div>}
</Subscription>

<Subscription value={storage} selector={v => v.count}>
  {count => <div>{count()}</div>}
</Subscription>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `Subscribable & Readable` | The reactive source |
| `selector?` | `(value) => R` | Optional selector for granular updates |
| `children` | `(value: Accessor<R>) => JSX.Element` | Render function receiving an accessor |

## Common Mistakes

### [CRITICAL] Reading the accessor without calling it

Wrong:

```tsx
const value = useSubscription(store)
return <div>{value}</div>
```

Correct:

```tsx
const value = useSubscription(store)
return <div>{value()}</div>
```

`useSubscription` returns a Solid `Accessor`; you must call it (`value()`) to read and track the value. The same applies to the `Subscription` component's children argument — call it (`value()`) inside JSX, don't treat it as a plain value.

### [HIGH] Passing reactive props directly instead of a getter

Wrong:

```tsx
function Item(props: { store: Store<number> }) {
  const value = useSubscription(props.store)
}
```

Correct:

```tsx
function Item(props: { store: Store<number> }) {
  const value = useSubscription(() => props.store)
}
```

Reading `props.store` outside a tracked scope loses reactivity; the getter form re-subscribes when the prop changes.

### [CRITICAL] Importing from seitu/react in Solid

Wrong:

```ts
import { useSubscription } from 'seitu/react'
```

Correct:

```ts
import { useSubscription } from 'seitu/solid'
```

Solid apps must use the `seitu/solid` primitive/component — the React versions rely on `useSyncExternalStore` and React internals.

### [LOW] Preferring the component over the primitive without reason

Wrong:

```tsx
<Subscription value={s}>{v => <Child value={v()} />}</Subscription>
```

Correct:

```tsx
const v = useSubscription(s); return <Child value={v()} />
```

`useSubscription` is simpler for most cases; `Subscription` is for render-prop composition.

## See also

- [`create-scroll-state`](create-scroll-state.md) — Scroll tracking uses the getter + ref pattern in Solid.

## Source

`src/solid/hooks.ts`, `src/solid/components.ts`
