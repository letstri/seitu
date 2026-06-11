---
name: createScrollState
description: >-
  Create a reactive scroll position tracker for an element.
  Use when tracking scroll position, edges, and remaining scroll distance.
---

# createScrollState

Reactive scroll position tracking for an element. Reports per-edge `reached` and `remaining` values.

```ts
import { createScrollState } from 'seitu/web'

const scroll = createScrollState({
  element: document.querySelector('.container'),
  direction: 'vertical',
  threshold: 10,
})

scroll.get()
// { top: { reached, remaining }, bottom: { reached, remaining }, left: ..., right: ... }
scroll.subscribe(state => console.log(state.bottom.reached))
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `element` | `Element \| null \| (() => Element \| null)` | Target element; getter for lazy resolution |
| `direction?` | `'vertical' \| 'horizontal' \| 'both'` | Axes to track (default `'both'`) |
| `threshold?` | `number \| { top?, bottom?, left?, right? }` | Pixels from edge to count as "reached" (default `0`) |

## Interface

```ts
interface ScrollState extends Subscribable<ScrollStateValue>, Readable<ScrollStateValue> {}

interface ScrollStateValue {
  top: ScrollStateEdge
  bottom: ScrollStateEdge
  left: ScrollStateEdge
  right: ScrollStateEdge
}

interface ScrollStateEdge {
  reached: boolean
  remaining: number
}
```

## React usage (with ref)

```tsx
const ref = useRef<HTMLDivElement>(null)
const state = useSubscription(() =>
  createScrollState({ element: () => ref.current, direction: 'vertical' })
)
```

## Source

`seitu/src/web/scroll-state.ts`
