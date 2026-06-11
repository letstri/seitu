---
name: create-is-online
description: >-
  Reactive navigator.onLine status.
type: core
library: seitu
library_version: "0.16.0"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/web/is-online.mdx
  - letstri/seitu:seitu/src/web/is-online.ts
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
## Common Mistakes

### [MEDIUM] Polling navigator.onLine manually

Wrong:

```ts
setInterval(() => setOnline(navigator.onLine), 1000)
```

Correct:

```ts
const online = createIsOnline()
online.subscribe(v => setOnline(v))
```

createIsOnline subscribes to online/offline events.

### [MEDIUM] Assuming onLine means reachable server

Wrong:

```ts
if (online.get()) fetch('/api') // always succeeds
```

Correct:

```ts
if (online.get()) fetch('/api').catch(handleOffline)
```

onLine is browser connectivity, not server health.

### [LOW] Guarding creation with typeof window

Wrong:

```ts
const online = typeof window !== 'undefined' ? createIsOnline() : null
```

Correct:

```ts
const online = createIsOnline()
```

Returns false when offline API unavailable; safe at module scope.

## Source

`src/web/is-online.ts`