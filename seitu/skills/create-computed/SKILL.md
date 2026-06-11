---
name: create-computed
description: >-
  Derived read-only subscription from one or many sources.
type: core
library: seitu
library_version: "0.15.1"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/core/computed.mdx
  - letstri/seitu:seitu/src/core/computed.ts
---

# createComputed

Derived read-only subscription from one or many sources. Lazy — only subscribes to sources when it has its own subscribers.

## Single source

```ts
import { createComputed, createStore } from 'seitu'

const store = createStore({ a: 1, b: 2 })
const sum = createComputed(store, s => s.a + s.b)
sum.get() // 3
```

## Multiple sources

```ts
import { createComputed, createStore } from 'seitu'

const a = createStore(1)
const b = createStore(2)
const total = createComputed([a, b], ([a, b]) => a + b)
total.get() // 3
```

## Overloads

```ts
function createComputed<T, R>(source: Source<T>, transform: (value: T) => R): Computed<R>
function createComputed<S extends Source[], R>(sources: [...S], transform: (values: SourceValues<S>) => R): Computed<R>
```

## Interface

```ts
interface Computed<T> extends Readable<T>, Subscribable<T> {}
```

Read-only. No `set()`.
## Common Mistakes

### [HIGH] Recomputing manually in components

Wrong:

```ts
const sum = a.get() + b.get()
```

Correct:

```ts
const sum = createComputed([a, b], ([x, y]) => x + y)
```

createComputed subscribes to sources and caches until they notify.

### [HIGH] Creating computed inside render

Wrong:

```ts
function App() {
  const total = createComputed(store, s => s.a + s.b)
}
```

Correct:

```ts
const total = createComputed(store, s => s.a + s.b)
```

New computed each render re-subscribes and loses memoization benefits.

### [MEDIUM] Writing to computed

Wrong:

```ts
sum.set(10)
```

Correct:

```ts
store.set({ a: 5, b: 5 })
```

Computed is read-only; use the source store's set().

## Source

`src/core/computed.ts`