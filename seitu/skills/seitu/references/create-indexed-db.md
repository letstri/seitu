# createIndexedDb

Single owner of an IndexedDB connection. Takes `createIndexedDbStorage` / `createIndexedDbTable` definitions under `stores` (the key is the object store name), builds one handle per definition under `db.stores`, creates missing stores and indexes, bumps the version automatically, and serializes concurrent databases with the same name so they never race during an upgrade.

```ts
import {
  createIndexedDb,
  createIndexedDbStorage,
  createIndexedDbTable,
} from 'seitu/web'
import * as z from 'zod'

const db = createIndexedDb({
  name: 'app',
  stores: {
    settings: createIndexedDbStorage({
      schemas: { theme: z.string() },
      defaultValues: { theme: 'light' },
    }),
    todos: createIndexedDbTable({
      keyPath: 'id',
      indexes: { status: 'status', order: 'order' },
      schema: z.object({
        id: z.string(),
        status: z.enum(['open', 'done']),
        order: z.number(),
      }),
    }),
  },
})

const { settings, todos } = db.stores // IndexedDbStorage, IndexedDbTable

await db.ready // connection open, every store exists, every storage hydrated
```

## Options

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | Database name |
| `stores` | `Record<string, IndexedDbStore>` | Storage/table definitions keyed by object store name |
| `version?` | `number` | Minimum version. Bumped automatically when a store/index is missing |
| `onUpgrade?` | `(ctx) => void` | Runs inside the `versionchange` transaction after stores/indexes are created. For data migrations |

## Migrations

Bump `version` when existing rows need rewriting (new stores and indexes bump it on their own), then rewrite rows with `ctx.migrate`:

```ts
const db = createIndexedDb({
  name: 'app',
  version: 2, // v1 rows have no `priority`
  stores: { todos: createIndexedDbTable({ keyPath: 'id', schema }) },
  onUpgrade: ({ oldVersion, migrate }) => {
    if (oldVersion < 2) {
      migrate('todos', (row, key) => ({ ...row, priority: row.priority ?? 0 }))
    }
  },
})
```

`migrate(storeName, rewrite)` walks every row of a declared store with a cursor. Store names and row types come from `stores`; the row is also indexable by any key, so fields the current schema dropped are still readable. Return the new row, `null` to delete it, or nothing to keep it.

Everything in `onUpgrade` is synchronous: `migrate` queues the cursor walk and returns `void`, `onUpgrade` cannot be `async`, and a throw inside `rewrite` aborts the `versionchange` transaction, so the database is never half-migrated. `transaction` and `database` stay on the context for raw IndexedDB work.

Limits of the cursor walk:

- **Fields, not keys.** Returning a row whose `keyPath` field changed aborts the upgrade (`cursor.update` rejects a key that differs from the cursor's). Rekey by deleting and re-`put`ting after `ready`.
- **Indexes are already filled.** They are created before `onUpgrade` runs, so a `unique` index added in the same version fails on duplicate legacy rows before the migration can dedupe them. Clean up in one version, add the index in the next.
- **Failure is warn-only.** An aborted upgrade rolls back whole, logs `console.warn`, and leaves the database on its old version. `ready` still resolves, but every later read and write rejects, because each one retries the same failing upgrade.

Object store shape (`keyPath`, `autoIncrement`, `indexes`) lives on the table definition, not here. A storage is always an out-of-line key/value store.

## Interface

```ts
interface IndexedDb<Stores> {
  ready: Promise<void> // open + stores created + storages hydrated; never rejects
  close: () => void // reopened lazily on next access
  stores: { [K in keyof Stores]: IndexedDbStorage<...> | IndexedDbTable<...> } // one handle per definition
  '~': { name: string; getDatabase: () => Promise<IDBDatabase> }
}

// every handle under db.stores
interface IndexedDbStoreHandle {
  db: IndexedDb
  storeName: string
  hydrate?: () => Promise<unknown> // storages only; awaited by db.ready
}

// what a definition exposes to the database
interface IndexedDbStore<Handle> {
  '~': {
    definition: { keyPath?; autoIncrement?; indexes? }
    create: (db: IndexedDb, storeName: string) => Handle
  }
}
```

## Behaviour

- Builds every handle synchronously in the constructor. A definition is reusable: the same one can back several stores or databases, each gets its own handle.
- Opens eagerly in the browser; `ready` also awaits every storage's first hydrate. Tables have nothing to hydrate.
- Missing store or index → closes, reopens at `version + 1`, creates it in `onupgradeneeded`.
- `version` is a **minimum**, not a pin. A pinned version lower than the existing one is recovered automatically.
- `onUpgrade` receives `migrate(storeName, rewrite)` for cursor-based row migrations (see [Migrations](#migrations)).
- Another connection upgrading the database → this handle closes and reopens on next access (`onversionchange`).
- Upgrade blocked by a foreign connection → `console.warn`, then waits.
- Two databases with the same `name` created in the same tick are serialized through a module-level lock.
- SSR (no `indexedDB`): `ready` resolves, `getDatabase()` rejects.

## Common Mistakes

### [HIGH] Using the definition as the handle

Wrong:

```ts
const todos = createIndexedDbTable({ keyPath: 'id', schema })
createIndexedDb({ name: 'app', stores: { todos } })
await todos.put(row) // definition has no put
```

Correct:

```ts
const db = createIndexedDb({
  name: 'app',
  stores: { todos: createIndexedDbTable({ keyPath: 'id', schema }) },
})
await db.stores.todos.put(row)
```

`createIndexedDbStorage` / `createIndexedDbTable` return definitions with no public API. Handles live under `db.stores`.

### [HIGH] Declaring the same database in several places with different stores

Wrong:

```ts
const a = createIndexedDb({ name: 'app', stores: { a: createIndexedDbStorage(...) } })
const b = createIndexedDb({ name: 'app', stores: { b: createIndexedDbStorage(...) } })
```

Correct:

```ts
const db = createIndexedDb({ name: 'app', stores: { a: createIndexedDbStorage(...), b: createIndexedDbStorage(...) } })
```

It works (stores get added on the fly) but every extra declaration costs a version bump and a reconnect. Declare once.

### [MEDIUM] Indexing a boolean

Wrong:

```ts
createIndexedDbTable({ keyPath: 'id', indexes: { done: 'done' }, schema }) // done: boolean
```

Correct:

```ts
createIndexedDbTable({ keyPath: 'id', indexes: { status: 'status' }, schema }) // status: 'open' | 'done'
```

Booleans are not valid IndexedDB keys; such rows silently never appear in the index. Use strings, numbers, dates, or arrays.

## See also

- [`create-indexed-db-storage`](create-indexed-db-storage.md) — key/value store definition.
- [`create-indexed-db-table`](create-indexed-db-table.md) — row-based store definition with indexes and reactive queries.

## Source

`src/web/indexed-db/index.ts`
