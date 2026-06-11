---
name: createReadableSubscription
description: >-
  Compose get + subscribe + notify into a Readable & Subscribable object.
  Use when building custom primitives that need the standard Seitu interface.
---

# createReadableSubscription

Composes a `get` function with a `subscribe`/`notify` pair into a `Readable<T> & Subscribable<T>` object. Used internally by all Seitu primitives.

```ts
import { createReadableSubscription, createSubscription } from 'seitu'

const { subscribe, notify } = createSubscription()
let value = 0
const get = () => value

const readable = createReadableSubscription(get, subscribe, notify)
readable.get() // 0
readable.subscribe(v => console.log(v))
```

## Signature

```ts
function createReadableSubscription<T>(
  get: () => T,
  subscribe: (callback: () => any, options?: SubscribeOptions) => () => void,
  notify: () => void,
): Readable<T> & Subscribable<T>
```

## Returns

An object with:
- `get()` — returns current value
- `subscribe(cb, opts?)` — subscribes; callback receives `get()` result
- `~.notify` — internal notify reference
- `~.output` — type-level output marker

## Source

`seitu/src/core/subscription.ts`
