---
name: create-debounced
description: >-
  Debounce updates from a source subscribable.
type: core
library: seitu
library_version: "0.15.1"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/core/debounced.mdx
  - letstri/seitu:seitu/src/core/debounced.ts
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
## Common Mistakes

### [HIGH] Debouncing the source instead of wrapping it

Wrong:

```ts
const raw = createStore(0)
setTimeout(() => raw.set(v), 300)
```

Correct:

```ts
const debounced = createDebounced(raw, 300)
```

createDebounced wraps a Readable & Subscribable; mutating the source bypasses debounce.

### [MEDIUM] Expecting immediate get after source change

Wrong:

```ts
source.set(1); debounced.get() // expects 1 immediately
```

Correct:

```ts
debounced.subscribe(v => console.log(v))
```

get() returns last emitted value until wait elapses.

### [LOW] Zero or negative wait

Wrong:

```ts
createDebounced(source, 0)
```

Correct:

```ts
createDebounced(source, 300)
```

Invalid wait breaks timing expectations.

## Source

`src/core/debounced.ts`