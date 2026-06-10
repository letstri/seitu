---
name: Subscription-react
description: >-
  Declarative React component for subscribing to Seitu reactive values via
  render props. Use when you prefer a component API over the useSubscription hook.
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

## Source

`seitu/src/react/components.tsx`
