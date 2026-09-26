# createElementSize

Reactive width and height of an element, driven by `ResizeObserver`.

```ts
import { createElementSize } from 'seitu/web'

const size = createElementSize({
  element: document.querySelector('.container'),
  box: 'content-box',
})

size.get() // { width, height }
size.subscribe(({ width }) => console.log(width))
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `element` | `Element \| null \| (() => Element \| null)` | Target element; getter is resolved once on first subscribe |
| `box?` | `'content-box' \| 'border-box'` | Box to measure (default `'border-box'`) |

## Interface

```ts
interface ElementSize extends Subscribable<ElementSizeValue>, ServerReadable<ElementSizeValue> {}

interface ElementSizeValue {
  width: number
  height: number
}
```

Sizes ignore CSS transforms, like `ResizeObserver`. A null element and the
server snapshot return `{ width: 0, height: 0 }`.

## React usage (callback ref)

```tsx
const [el, setEl] = useState<HTMLDivElement | null>(null)
const { width, height } = useSubscription(
  () => createElementSize({ element: el }),
  { deps: [el] }
)
return <div ref={setEl} />
```

## Common Mistakes

### [CRITICAL] Reading a `useRef` through a getter

Wrong:

```tsx
const ref = useRef<HTMLDivElement>(null)
useSubscription(() => createElementSize({ element: () => ref.current }), { deps: [] })
```

The getter runs once on first subscribe. If the element is not mounted yet, or
unmounts and remounts, the observer never attaches to the live element.

Correct:

```tsx
const [el, setEl] = useState<HTMLDivElement | null>(null)
useSubscription(() => createElementSize({ element: el }), { deps: [el] })
return <div ref={setEl} />
```

### [MEDIUM] Hand-written `useEffect` + `ResizeObserver`

Replace a `useEffect` that creates a `ResizeObserver` and copies the size into
state with `createElementSize` + `useSubscription`.

## Source

`src/web/element-size/index.ts`
