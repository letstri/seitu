---
name: createDebouncedFn
description: >-
  Wrap a plain function in a debounced callable that also acts as a subscribable.
  Use when you need debounced function execution with reactive return value.
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

## Source

`seitu/src/core/debounced-fn.ts`
