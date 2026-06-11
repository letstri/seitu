---
name: createThrottled
description: >-
  Create a throttled readable that rate-limits updates from a source subscribable.
  Use when you need at-most-once-per-interval reactive updates.
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

## Source

`seitu/src/core/throttled.ts`
