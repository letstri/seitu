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

## Common Mistakes

### [CRITICAL] Mutating object state in place

Wrong:

```ts
store.set(prev => { prev.count++; return prev })
```

Correct:

```ts
store.set(prev => ({ ...prev, count: prev.count + 1 }))
```

set() skips notification when the new value is the same reference (===).

### [CRITICAL] Creating store inside a component

Wrong:

```ts
function App() {
  const store = createStore(0)
}
```

Correct:

```ts
const store = createStore(0)
function App() {
  const value = useSubscription(store)
}
```

A new store per render loses shared state and leaks subscriptions.

### [MEDIUM] Using JSON.stringify for change detection

Wrong:

```ts
store.set(prev => prev)
```

Correct:

```ts
store.set(prev => ({ ...prev }))
```

Reference equality is the notification gate; stringify adds cost without fixing in-place mutation.

## Source

`src/core/store.ts`
