# createSubscription

Low-level building block. Returns `subscribe` + `notify` pair. Used internally by all Seitu primitives.

```ts
import { createSubscription } from 'seitu'

const { subscribe, notify } = createSubscription({
  onFirstSubscribe() {
    // setup (e.g. add event listener)
    window.addEventListener('resize', notify)
    return () => {
      // cleanup when last subscriber leaves
      window.removeEventListener('resize', notify)
    }
  },
})
```

## Signature

```ts
function createSubscription(options?: {
  onFirstSubscribe?: () => (void | (() => void))
}): {
  subscribe: (callback: () => any, options?: SubscribeOptions) => () => void
  notify: () => void
}
```

## Behavior

- `onFirstSubscribe` is called when first subscriber is added.
- Return value of `onFirstSubscribe` is called when last subscriber is removed (cleanup).
- `subscribe` supports `{ immediate: true }` to fire callback immediately.
- Lazy: no setup until first subscriber.

## Common Mistakes

### [HIGH] Not returning unsubscribe from subscribe

Wrong:

```ts
subscribe(cb) { listeners.push(cb) }
```

Correct:

```ts
const { subscribe, notify } = createSubscription()
```

Callers rely on returned function to clean up listeners.

### [MEDIUM] Calling notify before subscribe setup

Wrong:

```ts
notify(); subscribe(cb)
```

Correct:

```ts
subscribe(cb); notify()
```

onFirstSubscribe hook wires upstream listeners.

### [MEDIUM] Reimplementing createReadableSubscription manually

Wrong:

```ts
return { get, subscribe, set: () => notify() }
```

Correct:

```ts
createReadableSubscription(get, subscribe, notify)
```

createReadableSubscription composes get + subscribe + notify correctly.

## Source

`src/core/subscription.ts`
