---
name: createDebounced
description: >-
  Create a debounced readable that delays updates from a source subscribable.
  Use when you need time-based rate limiting on reactive values.
---

# createDebounced

Wraps a source subscribable with debounce. Emits the latest value after `wait` ms of inactivity.

```ts
import { createStore, createDebounced } from 'seitu'

const input = createStore('')
const debounced = createDebounced(input, 300)
debounced.subscribe(value => console.log('debounced:', value))
debounced.get() // current debounced value
```

## Signature

```ts
function createDebounced<T>(source: Readable<T> & Subscribable<T>, wait: number): Debounced<T>
```

## Interface

```ts
interface Debounced<T> extends Readable<T>, Subscribable<T> {}
```

Read-only. Lazy subscription — only subscribes to source when it has its own subscribers.

## Source

`seitu/src/core/debounced.ts`
