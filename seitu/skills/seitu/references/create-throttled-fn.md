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

## Common Mistakes

### [HIGH] Using createThrottled on a function

Wrong:

```ts
createThrottled(fn, 100)
```

Correct:

```ts
createThrottledFn(fn, 100)
```

createThrottledFn wraps callables with throttle semantics.

### [MEDIUM] Rapid calls expecting every result

Wrong:

```ts
for (let i = 0; i < 100; i++) throttledFn(i)
```

Correct:

```ts
throttledFn(i); throttledFn.subscribe(v => latest = v)
```

Throttle drops intermediate invocations within the wait window.

### [LOW] Module-level fn with closed-over stale state

Wrong:

```ts
let x = 0; const f = createThrottledFn(() => x, 100)
```

Correct:

```ts
const f = createThrottledFn((n: number) => n * 2, 100); f(5)
```

Throttled fn closure captures variables; update via args not closure mutation.

## Source

`src/core/throttled-fn.ts`
