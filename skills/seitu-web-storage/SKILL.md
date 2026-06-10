---
name: seitu-web-storage
description: >-
  Persist reactive state in the browser with Seitu web primitives: createWebStorage,
  createWebStorageValue, createIndexedDbStorage, createMediaQuery, createIsOnline,
  createScrollState. Use when building localStorage, sessionStorage, IndexedDB persistence,
  media queries, online status, or scroll tracking with Seitu.
---

# Seitu Web Storage & Browser Primitives

All primitives live in `seitu/web`. They require a browser environment but
gracefully return defaults during SSR.

## createWebStorage

Multi-key reactive handle for `localStorage` or `sessionStorage`.
Each key is validated by a Standard Schema.

```ts
import { createWebStorage } from 'seitu/web'
import * as z from 'zod'

const storage = createWebStorage({
  type: 'localStorage', // or 'sessionStorage'
  schemas: {
    token: z.string().nullable(),
    preferences: z.object({ theme: z.enum(['light', 'dark']) }),
  },
  defaultValues: { token: null, preferences: { theme: 'light' } },
})

storage.get() // { token: null, preferences: { theme: 'light' } }
storage.set({ token: 'abc' }) // partial update
storage.clear() // remove all managed keys
storage.subscribe(console.log)
```

Cross-tab sync via `StorageEvent` while subscribed.

### Options

| Option              | Description                                        |
|---------------------|----------------------------------------------------|
| `type`              | `'localStorage'` or `'sessionStorage'`             |
| `schemas`           | Record of Standard Schema validators per key       |
| `defaultValues`     | Matching default values for each key               |
| `keyTransform?`     | Remap logical key → storage key string             |
| `onValidationError?`| Handle invalid stored data; can return corrected value |

## createWebStorageValue

Single-key reactive handle. Two overloads:

### Standalone (with schema)

```ts
import { createWebStorageValue } from 'seitu/web'
import * as z from 'zod'

const count = createWebStorageValue({
  type: 'localStorage',
  key: 'count',
  schema: z.number(),
  defaultValue: 0,
})

count.get() // 0
count.set(1)
count.set(v => v + 1)
count.clear()
```

### Derived from a WebStorage instance

```ts
const storage = createWebStorage({ /* ... */ })

const token = createWebStorageValue({
  storage,
  key: 'token',
})
```

Inherits schema, default, and storage type from the parent.

## createIndexedDbStorage

Multi-key reactive handle for IndexedDB. Async under the hood,
sync `get()` via in-memory cache.

```ts
import { createIndexedDbStorage } from 'seitu/web'
import * as z from 'zod'

const db = createIndexedDbStorage({
  databaseName: 'app',
  schemas: {
    token: z.string().nullable(),
    settings: z.object({ theme: z.enum(['light', 'dark']) }),
  },
  defaultValues: { token: null, settings: { theme: 'light' } },
})

db.get() // returns cached (defaults until hydrated)
await db.ready // wait for IndexedDB hydration
await db.set({ token: 'abc' }) // persists async
await db.clear() // resets to defaults + removes from IDB
```

### Key differences from WebStorage

- `set()` and `clear()` return `Promise<void>` (never rejects).
- `ready` promise resolves after initial hydration.
- Cross-tab sync via `BroadcastChannel` (while subscribed).
- `storeName` defaults to `'seitu'`, configurable.
- Handles `onversionchange` / version bumps automatically.

### Options

| Option              | Description                                        |
|---------------------|----------------------------------------------------|
| `databaseName`      | IndexedDB database name                            |
| `storeName?`        | Object store name (default `'seitu'`)              |
| `version?`          | Pin DB version; omit for auto-managed              |
| `schemas`           | Standard Schema validators per key                 |
| `defaultValues`     | Default values per key                             |
| `keyTransform?`     | Remap logical key → IDB key                        |
| `onValidationError?`| Handle invalid stored data                         |

## createMediaQuery

Reactive boolean for CSS media queries. Type-safe query string.

```ts
import { createMediaQuery } from 'seitu/web'

const isDark = createMediaQuery({ query: '(prefers-color-scheme: dark)' })
const isDesktop = createMediaQuery({ query: '(min-width: 768px)' })

isDark.get() // boolean
isDark.subscribe(matches => console.log(matches))
```

`defaultMatches` option for SSR (defaults to `false`).

## createIsOnline

Reactive boolean for `navigator.onLine`.

```ts
import { createIsOnline } from 'seitu/web'

const online = createIsOnline()
online.get()
online.subscribe(v => console.log(v ? 'online' : 'offline'))
```

## createScrollState

Reactive scroll position tracking for an element.

```ts
import { createScrollState } from 'seitu/web'

const scroll = createScrollState({
  element: document.querySelector('.container'),
  direction: 'vertical', // 'horizontal' | 'both' (default)
  threshold: 10, // px from edge to count as "reached"
})

scroll.get()
// { top: { reached, remaining }, bottom: { reached, remaining }, left: ..., right: ... }
```

Accepts `element` as direct reference or `() => Element | null` getter for lazy resolution (useful with React refs).
Per-side thresholds via `{ top, bottom, left, right }` object.

## Patterns

### Prefixed storage keys

```ts
const storage = createWebStorage({
  type: 'localStorage',
  schemas: { theme: z.string() },
  defaultValues: { theme: 'light' },
  keyTransform: key => `myapp:${String(key)}`,
})
```

### Repairing partial objects

```ts
import { repairValueObjectWithDefault } from 'seitu/utils'
import { createWebStorageValue } from 'seitu/web'
import * as z from 'zod'

const settings = createWebStorageValue({
  type: 'localStorage',
  key: 'settings',
  schema: z.object({ a: z.number(), b: z.string() }),
  defaultValue: { a: 0, b: 'default' },
  onValidationError: repairValueObjectWithDefault,
})
```
