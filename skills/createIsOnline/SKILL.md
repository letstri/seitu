---
name: createIsOnline
description: >-
  Create a reactive boolean for navigator.onLine status.
  Use when tracking online/offline state reactively.
---

# createIsOnline

Reactive boolean for `navigator.onLine`. Listens to `online`/`offline` window events.

```ts
import { createIsOnline } from 'seitu/web'

const online = createIsOnline()
online.get() // true or false
online.subscribe(v => console.log(v ? 'online' : 'offline'))
```

## Interface

```ts
interface IsOnline extends Subscribable<boolean>, Readable<boolean> {}
```

No options. Returns `true` during SSR (when `navigator` is undefined). Lazy — only listens to events while subscribed.

## Source

`seitu/src/web/is-online.ts`
