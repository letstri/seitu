---
name: createThrottledFn
description: >-
  Wrap a plain function in a throttled callable that also acts as a subscribable.
  Use when you need throttled function execution with reactive return value.
---

# createThrottledFn

Wraps a plain function. First call fires immediately, subsequent calls within `wait` are batched — only the last fires when interval elapses.

```ts
import { createThrottledFn } from 'seitu'

const log = createThrottledFn((msg: string) => console.log(msg), 300)
log('hello') // fires immediately
log('world') // throttled — fires after 300ms
log.get() // latest return value (undefined until first call)
log.subscribe(result => console.log('result:', result))
```

## Signature

```ts
function createThrottledFn<F extends (...args: any[]) => any>(fn: F, wait: number): ThrottledFn<F>
```

## Interface

```ts
interface ThrottledFn<F> extends Readable<ReturnType<F> | undefined>, Subscribable<ReturnType<F> | undefined> {
  (...args: Parameters<F>): void
}
```

Callable + readable + subscribable. `get()` returns `undefined` until first execution.

## Source

`seitu/src/core/throttled-fn.ts`
