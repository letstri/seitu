---
name: createComputed
description: >-
  Create derived read-only subscriptions from one or many sources with Seitu.
  Use when building computed/derived reactive values.
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

## Source

`seitu/src/core/computed.ts`
