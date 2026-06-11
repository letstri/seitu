---
name: subscription-react
description: >-
  Render-prop Subscription component for React.
type: framework
library: seitu
library_version: "0.16.0"
requires:
  - seitu-overview
  - use-subscription-react
sources:
  - letstri/seitu:docs/content/docs/react/components.mdx
  - letstri/seitu:seitu/src/react/components.tsx
---

# Subscription (React component)

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

## Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `Subscribable & Readable` | The reactive source |
| `selector?` | `(value) => R` | Optional selector for granular updates |
| `children` | `(value) => ReactNode` | Render function |
## Common Mistakes

### [CRITICAL] Using without use client

Wrong:

```ts
export function Page() {
  return <Subscription source={store}>{v => v}</Subscription>
}
```

Correct:

```ts
'use client'
export function Page() {
  return <Subscription source={store}>{v => v}</Subscription>
}
```

Component uses hooks internally.

### [HIGH] Inline source factory without key/deps

Wrong:

```ts
<Subscription source={() => createStore(prop)}>{...}</Subscription>
```

Correct:

```ts
<Subscription key={prop} source={() => createStore(prop)}>{...}</Subscription>
```

Same as hook — factory recreates only when React remounts.

### [LOW] Preferring component over hook without reason

Wrong:

```ts
<Subscription source={s}>{v => <Child value={v} />}</Subscription>
```

Correct:

```ts
const v = useSubscription(s); return <Child value={v} />
```

useSubscription is simpler for most cases; Subscription for render-prop composition.

## Source

`src/react/components.tsx`