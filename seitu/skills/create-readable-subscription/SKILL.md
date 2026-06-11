---
name: create-readable-subscription
description: >-
  Compose get + subscribe + notify into standard Readable & Subscribable.
type: core
library: seitu
library_version: "0.16.0"
requires:
  - seitu-overview
  - create-subscription
sources:
  - letstri/seitu:seitu/src/core/subscription.ts
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
## Common Mistakes

### [HIGH] Mismatched get and notify timing

Wrong:

```ts
const get = () => stale; notify()
```

Correct:

```ts
let state = 0; const get = () => state; notify()
```

get must reflect value at notify time.

### [CRITICAL] Omitting notify on external changes

Wrong:

```ts
state = next // no notify()
```

Correct:

```ts
state = next; notify()
```

Subscribers only update when notify runs.

### [MEDIUM] Using for writable stores without set

Wrong:

```ts
readable.set(1)
```

Correct:

```ts
const store = createStore(0)
```

Readable subscription has no set — use createStore or compose Writable separately.

## Source

`src/core/subscription.ts`