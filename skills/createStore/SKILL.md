---
name: createStore
description: >-
  Create a minimal reactive store with Seitu. Use when building reactive state
  with get/set/subscribe pattern.
---

# createStore

Minimal reactive store from `seitu` (core). Accepts any value type.

```ts
import { createStore } from 'seitu'

const count = createStore(0)
count.get() // 0
count.set(1)
count.set(prev => prev + 1)
count.subscribe(v => console.log(v))
```

## Behavior

- `set()` skips notification when new value is same reference (`===`).
- For objects, always spread to create a new reference:

```ts
const store = createStore({ count: 0, name: '' })
store.set(prev => ({ ...prev, count: prev.count + 1 }))
```

## Interface

```ts
interface Store<T> extends Readable<T>, Writable<T, T>, Subscribable<T> {}
```

| Method | Description |
|--------|-------------|
| `get()` | Returns current value |
| `set(value \| updater)` | Sets value or applies updater function |
| `subscribe(cb, opts?)` | Subscribes to changes; returns unsubscribe fn |

`subscribe` accepts `{ immediate?: boolean }` to fire callback immediately with current value.

## Source

`seitu/src/core/store.ts`
