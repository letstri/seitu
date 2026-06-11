---
name: createIndexedDbStorage
description: >-
  Create a multi-key reactive handle for IndexedDB with schema validation.
  Use when persisting state to IndexedDB with async set and sync cached get.
---

# createIndexedDbStorage

Multi-key reactive handle for IndexedDB. Async under the hood, sync `get()` via in-memory cache.

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

## Key differences from WebStorage

- `set()` and `clear()` return `Promise<void>` (never rejects).
- `ready` promise resolves after initial hydration.
- Cross-tab sync via `BroadcastChannel` (while subscribed).
- `storeName` defaults to `'seitu'`, configurable.
- Handles `onversionchange` / version bumps automatically.

## Options

| Option | Type | Description |
|--------|------|-------------|
| `databaseName` | `string` | IndexedDB database name |
| `storeName?` | `string` | Object store name (default `'seitu'`) |
| `version?` | `number` | Pin DB version; omit for auto-managed |
| `schemas` | `Record<string, StandardSchema>` | Validators per key |
| `defaultValues` | matching record | Default values per key |
| `keyTransform?` | `(key) => string` | Remap logical key to IDB key |
| `onValidationError?` | `(props) => void \| value` | Handle invalid stored data |

## Interface

```ts
interface IndexedDbStorage<O> extends Subscribable<O>, Readable<O>, Writable<Partial<O>, O>, Clearable {
  ready: Promise<O>
  set: (value: Partial<O> | ((prev: O) => Partial<O>)) => Promise<void>
  clear: () => Promise<void>
}
```

## Source

`seitu/src/web/indexed-db-storage.ts`
