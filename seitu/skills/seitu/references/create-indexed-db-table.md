# createIndexedDbTable

Defines a row-based store for `createIndexedDb({ stores })`: many rows addressed by `keyPath`, optional indexes, key ranges, validation on write and read. Returns a definition only; the handle lives under `db.stores.<name>`. The row API is async and never loads the whole store into memory. Reactivity comes from `query()`.

```ts
import { createIndexedDb, createIndexedDbTable } from 'seitu/web'
import * as z from 'zod'

const db = createIndexedDb({
  name: 'app',
  stores: {
    todos: createIndexedDbTable({
      keyPath: 'id',
      indexes: { status: 'status', order: 'order' },
      schema: z.object({
        id: z.string(),
        title: z.string(),
        status: z.enum(['open', 'done']),
        order: z.number(),
      }),
    }),
  },
})
const { todos } = db.stores

await todos.put({ id: '1', title: 'a', status: 'open', order: 1 })
await todos.put([/* many rows */]) // one transaction
await todos.get('1')
await todos.getAll() // every row
await todos.getAll(IDBKeyRange.bound('1', '5'), 10) // range + limit
await todos.index('status').getAll('open') // index names and keys are typed
await todos.index('order').getAllKeys(IDBKeyRange.upperBound(3))
await todos.count()
await todos.delete('1')
await todos.delete(['1', '2'])
await todos.delete(IDBKeyRange.bound('1', '5'))
await todos.clear()

// Reactive query: Readable + Subscribable, same contract as createComputed.
const open = todos.query((t) => t.index('status').getAll('open'), {
  initial: [],
})
open.get() // [] until the first run settles
await open.ready // first result
open.subscribe((rows) => {}) // re-runs after every write, local or from another tab
```

## Options

| Option | Type | Description |
| --- | --- | --- |
| `schema` | `StandardSchema` | Row schema. Validated on `put` (rejects) and on read (drops/repairs) |
| `onValidationError?` | `({ issues, value }) => void \| Row` | Read-side repair hook. Return a row to keep it, nothing to drop it |
| `keyPath?` | `keyof Row \| \`${keyof Row}.${string}\` \| ...[]` | Primary key path. Must name a schema field that can hold a key. Omit for out-of-line keys (pass `key` to `put`) |
| `autoIncrement?` | `boolean` | Key generator |
| `indexes?` | `Record<string, keyPath \| keyPath[] \| { keyPath, unique?, multiEntry? }>` | Indexes. String value is shorthand for `{ keyPath }`. Same key-path rules. Names are typed on `index()` |

Key paths are checked against the schema: a top-level field whose value can be
a key (`string`, `number`, `Date`, `BufferSource`, or an array of those), or
any field followed by a nested path (`'meta.slug'` — only the first segment is
checked). A loose schema has no known fields, so any path is accepted.

An optional field (`z.string().optional()`) is a valid key path — a row without
it is skipped by an index, and rejected by a `keyPath` store. A nullable one
(`z.string().nullable()`) is not: `null` is not a valid key.

## Interface

```ts
// `Definition` is the store options minus `schema`/`onValidationError`; it is
// what types index names, key ranges, and `delete`. `Key` below is the key
// type read off the matching key path, or `IDBValidKey` when it cannot be
// narrowed (compound and nested key paths).
interface IndexedDbTable<Row, Definition> {
  get: (key: Key | IDBKeyRange) => Promise<Row | undefined>
  getAll: (query?: Key | IDBKeyRange | null, count?) => Promise<Row[]>
  getAllKeys: (query?, count?) => Promise<IDBValidKey[]> // primary keys, even on an index
  count: (query?) => Promise<number>
  index: (name: IndexName) => { get; getAll; getAllKeys; count } // keyed by that index
  put: (rows: Row | Row[], key?: IDBValidKey) => Promise<void> // rejects with IndexedDbTableValidationError; `key` is `never` when `keyPath` is set
  delete: (keys: Key | IDBKeyRange | Key[]) => Promise<void>
  clear: () => Promise<void>
  query: <R>(
    run: (t) => Promise<R>,
    options?: { initial: R }
  ) => IndexedDbQuery<R>
  db: IndexedDb
  storeName: string
  '~': { schema; subscribe; notify }
}

interface IndexedDbQuery<R> extends Readable<R>, Subscribable<R> {
  ready: Promise<R> // never rejects; keeps initial on failure
  refresh: () => Promise<R>
}
```

## Query semantics

- Result cached; `get()` is sync. Notifies only when the new result is not deep-equal.
- Re-runs on: every local write to the table, cross-tab writes (BroadcastChannel, while subscribed), first subscribe, `refresh()`.
- Overlapping runs: latest wins, stale results discarded.
- Without `initial`, `get()` is `R | undefined`.
- Server snapshot = `initial` (framework bindings hydrate without mismatch).

## Breaking changes in 1.1

`IndexedDbTable`'s second type argument was the union of index names; it is now
the store definition (`keyPath`, `autoIncrement`, `indexes`), which is what
types index names, key ranges, `delete` and the `put` key. A hand-written
`IndexedDbTable<Row, 'status'>` still compiles but silently falls back to
untyped keys — write `IndexedDbTable<Row, { keyPath: 'id'; indexes: { status:
'status' } }>`, or let `typeof db.stores.todos` infer it.

Key paths are also checked against the schema now, so a path that never
matched a row field, or names a field that cannot hold a key (a boolean, an
object), is a compile error instead of a runtime `DataError`.

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

### [HIGH] Subscribing to the table instead of a query

Wrong:

```ts
useSubscription(todos) // table is not Readable
```

Correct:

```ts
const all = db.stores.todos.query((t) => t.getAll(), { initial: [] })
useSubscription(all)
```

The table is an async row API. Queries are the reactive surface.

### [HIGH] Creating queries inside a component

Wrong:

```ts
function List() {
  const q = todos.query((t) => t.getAll(), { initial: [] }) // new query every render
}
```

Correct:

```ts
const all = todos.query((t) => t.getAll(), { initial: [] }) // module scope
```

### [MEDIUM] Using storage for lists

Wrong:

```ts
createIndexedDbStorage({ schemas: { todos: z.array(todo) }, ... }) // whole array rewritten per change
```

Correct:

```ts
createIndexedDbTable({ keyPath: 'id', schema: todo })
```

Storage is for a handful of settings-like values. Rows go in a table.

### [MEDIUM] Boolean index keys

Booleans are not valid IndexedDB keys, and a boolean field is now rejected as a
key path at compile time. Index a string/number/date instead
(`status: 'open' | 'done'`).

### [MEDIUM] Passing an explicit put key to a store with a keyPath

IndexedDB throws `DataError` for that, so `key` is typed `never` once `keyPath`
is set.

Wrong:

```ts
const todos = createIndexedDbTable({ keyPath: 'id', schema })
await db.stores.todos.put(row, '1') // key is not allowed here
```

Correct: let the `keyPath` supply the key, or drop `keyPath` and pass `key` on
every `put`.

### [MEDIUM] Expecting put to reject on invalid rows in Node without fake-indexeddb

Tests need `import 'fake-indexeddb/auto'` (or `vi.stubGlobal('indexedDB', new IDBFactory())`), and `IDBKeyRange` from `fake-indexeddb`.

## See also

- [`create-indexed-db`](create-indexed-db.md) — the database that owns the connection.
- [`create-indexed-db-storage`](create-indexed-db-storage.md) — key/value alternative for small settings-like data.
- [`create-computed`](create-computed.md) — same reactive contract as a query.

## Source

`src/web/indexed-db-table/index.ts`
