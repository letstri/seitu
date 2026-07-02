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

## Common Mistakes

### [CRITICAL] Passing static element ref

Wrong:

```ts
createScrollState({ element: ref.current })
```

Correct:

```ts
createScrollState({ element: () => ref.current, direction: 'vertical' })
```

element option accepts a getter so ref.current updates are tracked.

### [HIGH] Creating scroll state without ref attached

Wrong:

```ts
createScrollState({ element: () => ref.current }) // ref never attached
```

Correct:

```ts
<div ref={ref}>...</div>
```

Null element returns default scroll metrics.

### [HIGH] Module-level scroll state with dynamic element

Wrong:

```ts
const scroll = createScrollState({ element: () => el })
```

Correct:

```ts
useSubscription(() => createScrollState({ element: () => ref.current }), { deps: [] })
```

Factory pattern in useSubscription recreates when element changes.

## Source

`src/web/scroll-state.ts`
