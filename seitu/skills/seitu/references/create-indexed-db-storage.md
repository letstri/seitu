# createIndexedDbStorage

Defines a multi-key reactive key/value store for `createIndexedDb({ stores })`. Returns a definition only; the handle (async under the hood, sync `get()` via in-memory cache) lives under `db.stores.<name>`.

```ts
import { createIndexedDb, createIndexedDbStorage } from 'seitu/web'
import * as z from 'zod'

const db = createIndexedDb({
  name: 'app',
  stores: {
    session: createIndexedDbStorage({
      schemas: {
        token: z.string().nullable(),
        settings: z.object({ theme: z.enum(['light', 'dark']) }),
      },
      defaultValues: { token: null, settings: { theme: 'light' } },
    }),
  },
})
const { session } = db.stores

session.get() // returns cached (defaults until hydrated)
await db.ready // wait for IndexedDB hydration
await session.set({ token: 'abc' }) // persists async
await session.clear() // resets to defaults + removes from IDB
```

## Key differences from WebStorage

- `set()` and `clear()` return `Promise<void>` (never rejects).
- No `ready` on the handle: `db.ready` resolves after initial hydration.
- Cross-tab sync via `BroadcastChannel` (while subscribed).
- Factory returns a definition, not a handle. `createIndexedDb` owns the connection, creates the store, builds the handle.

## Options

| Option | Type | Description |
|--------|------|-------------|
| `schemas` | `Record<string, StandardSchema>` | Validators per key |
| `defaultValues` | matching record | Default values per key |
| `keyTransform?` | `(key) => string` | Remap logical key to IDB key |
| `onValidationError?` | `(props) => void \| value` | Handle invalid stored data |

## Interface

```ts
interface IndexedDbStorage<O> extends Subscribable<O>, Readable<O>, Writable<Partial<O>, O>, Clearable {
  set: (value: Partial<O> | ((prev: O) => Partial<O>)) => Promise<void>
  clear: () => Promise<void>
  hydrate: () => Promise<O> // re-read from IndexedDB now; db.ready calls it once
  db: IndexedDb
  storeName: string
  '~': { getDefaultValue; getSchema; transformKey }
}
```

Each key is one record in the store (out-of-line key = transformed key name).

## Common Mistakes

### [HIGH] Using the definition as the handle

Wrong:

```ts
const s = createIndexedDbStorage({ schemas, defaultValues })
createIndexedDb({ name: 'app', stores: { settings: s } })
s.get() // definition has no get
```

Correct:

```ts
const db = createIndexedDb({
  name: 'app',
  stores: { settings: createIndexedDbStorage({ schemas, defaultValues }) },
})
db.stores.settings.get()
```

The factory only describes the store. Nothing persists, reads, or subscribes without `createIndexedDb`.

### [HIGH] Treating set as synchronous

Wrong:

```ts
await storage.set(data)
expect(storage.get()).toEqual(persistedFromDb)
```

Correct:

```ts
storage.set(data)
storage.subscribe(next => { /* react when cache updates */ })
```

IndexedDB writes are async; get() returns cached value immediately.

### [MEDIUM] Using in Node without fake-indexeddb

Wrong:

```ts
createIndexedDbStorage({ ... }) // in vitest without polyfill
```

Correct:

```ts
import 'fake-indexeddb/auto'
```

IndexedDB is browser-only; tests need fake-indexeddb polyfill.

### [MEDIUM] Using storage for lists

Storage is for a handful of settings-like values. Rows go in [`create-indexed-db-table`](create-indexed-db-table.md).

## See also

- [`create-indexed-db`](create-indexed-db.md) — the database that owns the connection.
- [`create-web-storage`](create-web-storage.md) — same shape for localStorage/sessionStorage.

## Source

`src/web/indexed-db-storage/index.ts`
