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

## React usage (callback ref)

```tsx
const [el, setEl] = useState<HTMLDivElement | null>(null)
const state = useSubscription(
  () => createScrollState({ element: el, direction: 'vertical' }),
  { deps: [el] }
)
return <div ref={setEl} />
```

`element` accepts a getter, but it is resolved once when the first subscriber
attaches. A `useRef` getter binds to whatever exists at that moment and never
rebinds, so it misses elements that mount later or remount.

## Common Mistakes

### [CRITICAL] Reading a `useRef` through a getter

Wrong:

```tsx
const ref = useRef<HTMLDivElement>(null)
useSubscription(() => createScrollState({ element: () => ref.current }), { deps: [] })
```

The getter runs once on first subscribe. If the element is not mounted yet, or
unmounts and remounts, the listener is never attached to the live element.

Correct:

```tsx
const [el, setEl] = useState<HTMLDivElement | null>(null)
useSubscription(() => createScrollState({ element: el }), { deps: [el] })
return <div ref={setEl} />
```

`deps: [el]` rebuilds the subscription for every new element.

### [HIGH] Creating scroll state without the ref attached

Wrong:

```tsx
const [el, setEl] = useState<HTMLDivElement | null>(null)
useSubscription(() => createScrollState({ element: el }), { deps: [el] })
return <div>...</div> // setEl never called
```

Correct:

```tsx
return <div ref={setEl}>...</div>
```

Null element returns default scroll metrics.

## Source

`src/web/scroll-state/index.ts`
