---
name: create-debounced-fn
description: >-
  Debounced callable with reactive return value.
type: core
library: seitu
library_version: "0.16.0"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/core/debounced-fn.mdx
  - letstri/seitu:seitu/src/core/debounced-fn.ts
---

# createDebouncedFn

Wraps a plain function. The return value becomes subscribable state. Each call resets the debounce timer.

```ts
import { createDebouncedFn } from 'seitu'

const search = createDebouncedFn((q: string) => fetch(`/api?q=${q}`), 300)
search('hello') // debounced — fires after 300ms of inactivity
search.get() // latest return value (undefined until first call)
search.subscribe(result => console.log('result:', result))
```

## Signature

```ts
function createDebouncedFn<F extends (...args: any[]) => any>(fn: F, wait: number): DebouncedFn<F>
```

## Interface

```ts
interface DebouncedFn<F> extends Readable<ReturnType<F> | undefined>, Subscribable<ReturnType<F> | undefined> {
  (...args: Parameters<F>): void
}
```

Callable + readable + subscribable. `get()` returns `undefined` until first execution.
## Common Mistakes

### [HIGH] Using createDebounced on a function

Wrong:

```ts
createDebounced(fn, 300)
```

Correct:

```ts
createDebouncedFn(fn, 300)
```

createDebounced wraps subscribables; createDebouncedFn wraps callables.

### [MEDIUM] Expecting synchronous return from call

Wrong:

```ts
const result = debouncedFn()
```

Correct:

```ts
debouncedFn(); const result = useSubscription(debouncedFn)
```

Return value updates after debounced execution via subscription.

### [MEDIUM] Not subscribing to fn result

Wrong:

```ts
debouncedFn(args) // never read output
```

Correct:

```ts
debouncedFn(args); debouncedFn.subscribe(console.log)
```

DebouncedFn is Subscribable; subscribe or useSubscription to read latest result.

## Source

`src/core/debounced-fn.ts`