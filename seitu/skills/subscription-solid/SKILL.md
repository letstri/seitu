---
name: subscription-solid
description: >-
  Render-prop Subscription component for Solid.
type: framework
library: seitu
library_version: "0.16.0"
requires:
  - seitu-overview
  - use-subscription-solid
sources:
  - letstri/seitu:docs/content/docs/solid/components.mdx
  - letstri/seitu:seitu/src/solid/components.ts
---

# Subscription (Solid component)

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

## Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `Subscribable & Readable` | The reactive source |
| `selector?` | `(value) => R` | Optional selector for granular updates |
| `children` | `(value: Accessor<R>) => JSX.Element` | Render function receiving an accessor |

## Common Mistakes

### [CRITICAL] Treating children's argument as a value, not an accessor

Wrong:

```tsx
<Subscription value={store}>
  {value => <div>{value.count}</div>}
</Subscription>
```

Correct:

```tsx
<Subscription value={store}>
  {value => <div>{value().count}</div>}
</Subscription>
```

Unlike React, the children function runs once and receives a Solid `Accessor`; call it (`value()`) inside JSX.

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

### [CRITICAL] Importing from seitu/react in Solid

Wrong:

```ts
import { Subscription } from 'seitu/react'
```

Correct:

```ts
import { Subscription } from 'seitu/solid'
```

The React component relies on React internals; Solid apps must use `seitu/solid`.

## Source

`src/solid/components.ts`
