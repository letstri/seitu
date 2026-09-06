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
await todos.index('status').getAll('open') // index names are typed
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
| `keyPath?` | `string \| string[]` | Primary key path. Omit for out-of-line keys (pass `key` to `put`) |
| `autoIncrement?` | `boolean` | Key generator |
| `indexes?` | `Record<string, string \| string[] \| { keyPath, unique?, multiEntry? }>` | Indexes. String value is shorthand for `{ keyPath }`. Names are typed on `index()` |

## Interface

```ts
interface IndexedDbTable<Row, IndexName> {
  get: (key) => Promise<Row | undefined>
  getAll: (query?, count?) => Promise<Row[]>
  getAllKeys: (query?, count?) => Promise<IDBValidKey[]>
  count: (query?) => Promise<number>
  index: (name: IndexName) => { get; getAll; getAllKeys; count }
  put: (rows: Row | Row[], key?: IDBValidKey) => Promise<void> // rejects with IndexedDbTableValidationError
  delete: (keys: IDBValidKey | IDBKeyRange | IDBValidKey[]) => Promise<void>
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

Booleans are not valid IndexedDB keys. Index a string/number/date instead (`status: 'open' | 'done'`).

### [MEDIUM] Expecting put to reject on invalid rows in Node without fake-indexeddb

Tests need `import 'fake-indexeddb/auto'` (or `vi.stubGlobal('indexedDB', new IDBFactory())`), and `IDBKeyRange` from `fake-indexeddb`.

## See also

- [`create-indexed-db`](create-indexed-db.md) — the database that owns the connection.
- [`create-indexed-db-storage`](create-indexed-db-storage.md) — key/value alternative for small settings-like data.
- [`create-computed`](create-computed.md) — same reactive contract as a query.

## Source

`src/web/indexed-db-table/index.ts`
