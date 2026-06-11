---
name: create-throttled
description: >-
  Throttle updates from a source subscribable.
type: core
library: seitu
library_version: "0.15.1"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/core/throttled.mdx
  - letstri/seitu:seitu/src/core/throttled.ts
---

# createThrottled

Wraps a source subscribable with throttle. Emits at most once every `wait` ms. First update fires immediately, trailing update fires after interval.

```ts
import { createStore, createThrottled } from 'seitu'

const input = createStore('')
const throttled = createThrottled(input, 300)
throttled.subscribe(value => console.log('throttled:', value))
throttled.get() // current throttled value
```

## Signature

```ts
function createThrottled<T>(source: Readable<T> & Subscribable<T>, wait: number): Throttled<T>
```

## Interface

```ts
interface Throttled<T> extends Readable<T>, Subscribable<T> {}
```

Read-only. Lazy subscription.
## Common Mistakes

### [MEDIUM] Using debounce for scroll-like high-frequency events

Wrong:

```ts
createDebounced(scrollSource, 16)
```

Correct:

```ts
createThrottled(scrollSource, 16)
```

Throttle emits at most once per interval; debounce waits for quiet period.

### [HIGH] Wrapping non-subscribable values

Wrong:

```ts
createThrottled(42, 100)
```

Correct:

```ts
createThrottled(store, 100)
```

Source must implement get and subscribe.

### [HIGH] Creating new throttled wrapper each render

Wrong:

```ts
function App() { const t = createThrottled(source, 100) }
```

Correct:

```ts
const t = createThrottled(source, 100)
```

Resets internal timer state.

## Source

`src/core/throttled.ts`