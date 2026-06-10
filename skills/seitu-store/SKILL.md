---
name: seitu-store
description: >-
  Create reactive stores with Seitu core primitives: createStore, createSchemaStore,
  createComputed, createDebounced, createThrottled, createDebouncedFn, createThrottledFn.
  Use when building reactive state, derived values, or debounced/throttled logic with Seitu.
---

# Seitu Core Stores

All primitives live in `seitu` (core entry point). They follow a consistent API:
`get()`, `subscribe(cb, opts?)`, and optionally `set(value | updater)`.

## createStore

Minimal reactive store. Accepts any value type.

```ts
import { createStore } from 'seitu'

const count = createStore(0)
count.get() // 0
count.set(1) // direct value
count.set(prev => prev + 1) // updater function
count.subscribe(v => console.log(v))
```

- `set()` skips notification when the new value is the same reference (`===`).
- For objects, always spread to create a new reference:

```ts
const store = createStore({ count: 0, name: '' })
store.set(prev => ({ ...prev, count: prev.count + 1 }))
```

## createSchemaStore

Store validated by a Standard Schema (Zod, Valibot, ArkType, etc.).
Falls back to `defaultValue` when validation fails.

```ts
import { createSchemaStore } from 'seitu'
import * as z from 'zod'

const store = createSchemaStore({
  schema: z.object({ count: z.number(), name: z.string() }),
  defaultValue: { count: 0, name: '' },
})
```

Optional `onValidationError` callback receives `{ issues, value, defaultValue }` and can return a corrected value.

## createComputed

Derived read-only subscription from one or many sources.

```ts
import { createComputed, createStore } from 'seitu'

// Single source
const store = createStore({ a: 1, b: 2 })
const sum = createComputed(store, s => s.a + s.b)

// Multiple sources
const a = createStore(1)
const b = createStore(2)
const total = createComputed([a, b], ([a, b]) => a + b)
```

Lazy — only subscribes to sources when it has its own subscribers.

## createDebounced / createThrottled

Wraps a source subscribable with time-based rate limiting.

```ts
import { createDebounced, createStore, createThrottled } from 'seitu'

const input = createStore('')
const debounced = createDebounced(input, 300) // emits after 300ms idle
const throttled = createThrottled(input, 300) // emits at most every 300ms
```

Both are read-only (`get()` + `subscribe()`). Lazy subscription.

## createDebouncedFn / createThrottledFn

Wraps a plain function. The return value becomes subscribable state.

```ts
import { createDebouncedFn } from 'seitu'

const search = createDebouncedFn((q: string) => fetch(`/api?q=${q}`), 300)
search('hello') // debounced call
search.get() // latest return value (undefined until first call)
search.subscribe(cb) // notified on each execution
```

## Interfaces

All stores implement combinations of:

| Interface       | Methods                        |
|-----------------|--------------------------------|
| `Readable<T>`   | `get(): T`                     |
| `Writable<T>`   | `set(value \| updater)`        |
| `Subscribable<T>` | `subscribe(cb, opts?) → unsub` |
| `Clearable`      | `clear()`                      |

`subscribe` accepts `{ immediate?: boolean }` to fire the callback immediately with the current value.

## Patterns

### Singleton module-level store

```ts
// stores/counter.ts
import { createStore } from 'seitu'

export const counterStore = createStore(0)
```

### Computed chain

```ts
const raw = createStore([1, 2, 3])
const sorted = createComputed(raw, arr => [...arr].sort())
const first = createComputed(sorted, arr => arr[0])
```
