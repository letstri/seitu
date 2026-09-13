import type { StandardSchemaV1 } from '@standard-schema/spec'
import { deepEqual } from 'fast-equals'

import type { ServerReadable, Subscribable } from '../../core'
import { createReadableSubscription, createSubscription } from '../../core'
import {
  createBroadcaster,
  requestToPromise,
  transactionDone,
} from '../../internal/indexed-db-request'
import { validateSchema, validateSync } from '../../internal/validate'
import type {
  IndexedDb,
  IndexedDbStore,
  IndexedDbStoreDefinition,
  IndexedDbStoreHandle,
} from '../indexed-db'

export type IndexedDbTableRange<Key extends IDBValidKey = IDBValidKey> =
  | Key
  | IDBKeyRange
  | null

export interface IndexedDbTableValidationErrorProps {
  issues: StandardSchemaV1.Issue[]
  value: unknown
}

export class IndexedDbTableValidationError extends Error {
  issues: readonly StandardSchemaV1.Issue[]
  value: unknown

  constructor(
    label: string,
    issues: readonly StandardSchemaV1.Issue[],
    value: unknown
  ) {
    super(
      `[${label}] Row failed validation: ${issues.map((issue) => issue.message).join('; ')}`
    )
    this.name = 'IndexedDbTableValidationError'
    this.issues = issues
    this.value = value
  }
}

export interface IndexedDbTableOptions<
  S extends StandardSchemaV1<unknown>,
> extends IndexedDbStoreDefinition<StandardSchemaV1.InferOutput<S>> {
  schema: S
  onValidationError?: (
    props: IndexedDbTableValidationErrorProps
  ) => void | StandardSchemaV1.InferOutput<S>
}

export type IndexedDbTableIndexNames<Definition> = Definition extends {
  indexes: infer Indexes
}
  ? keyof Indexes & string
  : string

type KeyAtPath<Row, Path, Value = Path extends keyof Row ? Row[Path] : never> =
  Extract<
    Value | (Value extends readonly (infer Element)[] ? Element : never),
    IDBValidKey
  > extends infer Key extends IDBValidKey
    ? [Key] extends [never]
      ? IDBValidKey
      : Key
    : IDBValidKey

type StoreShape<Definition> = {
  [
    K in keyof Definition as K extends 'schema' | 'onValidationError'
      ? never
      : K
  ]: Definition[K]
}

export type IndexedDbExplicitKey<Definition> = Definition extends {
  keyPath: unknown
}
  ? never
  : IDBValidKey

export type IndexedDbPrimaryKey<Row, Definition> = Definition extends {
  keyPath: infer Path
}
  ? KeyAtPath<Row, Path>
  : IDBValidKey

export type IndexedDbIndexKey<Row, Definition, Name> = Definition extends {
  indexes: infer Indexes
}
  ? Name extends keyof Indexes
    ? KeyAtPath<
        Row,
        Indexes[Name] extends { keyPath: infer Path } ? Path : Indexes[Name]
      >
    : IDBValidKey
  : IDBValidKey

export interface IndexedDbTableIndexReader<
  Row,
  Key extends IDBValidKey = IDBValidKey,
> {
  get: (key: Key | IDBKeyRange) => Promise<Row | undefined>
  getAll: (query?: IndexedDbTableRange<Key>, count?: number) => Promise<Row[]>
  getAllKeys: (
    query?: IndexedDbTableRange<Key>,
    count?: number
  ) => Promise<IDBValidKey[]>
  count: (query?: IndexedDbTableRange<Key>) => Promise<number>
}

export interface IndexedDbTableReader<
  Row,
  Definition = unknown,
> extends IndexedDbTableIndexReader<Row, IndexedDbPrimaryKey<Row, Definition>> {
  index: <Name extends IndexedDbTableIndexNames<Definition>>(
    name: Name
  ) => IndexedDbTableIndexReader<Row, IndexedDbIndexKey<Row, Definition, Name>>
}

export interface IndexedDbQueryOptions<R> {
  initial: R
}

export interface IndexedDbQuery<R> extends ServerReadable<R>, Subscribable<R> {
  ready: Promise<R>
  refresh: () => Promise<R>
}

export interface IndexedDbTable<Row, Definition = unknown>
  extends IndexedDbTableReader<Row, Definition>, IndexedDbStoreHandle {
  put: (
    rows: Row | Row[],
    key?: IndexedDbExplicitKey<Definition>
  ) => Promise<void>
  delete: (
    keys:
      | IndexedDbPrimaryKey<Row, Definition>
      | IDBKeyRange
      | IndexedDbPrimaryKey<Row, Definition>[]
  ) => Promise<void>
  clear: () => Promise<void>
  query: {
    <R>(
      run: (table: IndexedDbTableReader<Row, Definition>) => Promise<R>,
      options: IndexedDbQueryOptions<R>
    ): IndexedDbQuery<R>
    <R>(
      run: (table: IndexedDbTableReader<Row, Definition>) => Promise<R>
    ): IndexedDbQuery<R | undefined>
  }
  '~': {
    schema: StandardSchemaV1<unknown>
    subscribe: (callback: () => any) => () => void
    notify: () => void
  }
}

export type IndexedDbTableDefinition<
  S extends StandardSchemaV1<unknown>,
  Definition,
> = IndexedDbStore<
  IndexedDbTable<StandardSchemaV1.InferOutput<S>, StoreShape<Definition>>
>

function createTable<S extends StandardSchemaV1<unknown>>(
  options: IndexedDbTableOptions<S>,
  db: IndexedDb,
  storeName: string
): IndexedDbTable<StandardSchemaV1.InferOutput<S>> {
  type Row = StandardSchemaV1.InferOutput<S>

  const isSupported = typeof indexedDB !== 'undefined'
  const databaseName = db['~'].name
  const label = `createIndexedDbTable:${databaseName}/${storeName}`
  const { broadcast, listen } = createBroadcaster(
    `seitu:indexed-db:${databaseName}:${storeName}`
  )

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe: () => listen(() => notify()),
  })

  const validateRow = (raw: unknown): Row | undefined =>
    validateSchema(options.schema, raw, {
      defaultValue: undefined,
      label: label,
      onError: options.onValidationError,
    })

  const validateForWrite = (raw: unknown): Row => {
    const result = validateSync(options.schema, raw, label)
    if (result.issues) {
      throw new IndexedDbTableValidationError(label, result.issues, raw)
    }
    return result.value as Row
  }

  const read = async <T>(
    run: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> => {
    const database = await db['~'].getDatabase()
    const store = database
      .transaction(storeName, 'readonly')
      .objectStore(storeName)
    return requestToPromise(run(store))
  }

  const write = async (run: (store: IDBObjectStore) => void): Promise<void> => {
    const database = await db['~'].getDatabase()
    const transaction = database.transaction(storeName, 'readwrite')
    run(transaction.objectStore(storeName))
    await transactionDone(transaction)
    notify()
    broadcast()
  }

  const createReader = (
    source: (store: IDBObjectStore) => IDBObjectStore | IDBIndex
  ): IndexedDbTableIndexReader<Row> => ({
    get: async (key) =>
      validateRow(await read((store) => source(store).get(key))),
    getAll: async (query, count) =>
      (await read((store) => source(store).getAll(query, count)))
        .map(validateRow)
        .filter((row) => row !== undefined),
    getAllKeys: (query, count) =>
      read((store) => source(store).getAllKeys(query, count)),
    count: (query) => read((store) => source(store).count(query ?? undefined)),
  })

  const reader: IndexedDbTableReader<Row> = {
    ...createReader((store) => store),
    index: (name) => createReader((store) => store.index(name)),
  }

  const query = <R>(
    run: (table: IndexedDbTableReader<Row>) => Promise<R>,
    queryOptions?: IndexedDbQueryOptions<R>
  ): IndexedDbQuery<R | undefined> => {
    const initial = queryOptions?.initial
    let cache: R | undefined = initial
    let seq = 0

    const querySubscription = createSubscription({
      onFirstSubscribe: () => {
        const unsubscribe = subscribe(() => void refresh())
        void refresh()
        return unsubscribe
      },
    })

    async function refresh(): Promise<R | undefined> {
      if (!isSupported) {
        return cache
      }

      const current = ++seq
      let next: R
      try {
        next = await run(reader)
      } catch (error) {
        console.warn(
          `[${label}] Query failed, keeping the cached value.`,
          error
        )
        return cache
      }

      if (current !== seq) {
        return cache
      }

      if (!deepEqual(cache, next)) {
        cache = next
        querySubscription.notify()
      }

      return cache
    }

    const readable = createReadableSubscription(
      () => cache,
      querySubscription.subscribe,
      querySubscription.notify,
      () => initial
    )

    return {
      ...readable,
      ready: refresh(),
      refresh,
    }
  }

  return {
    ...reader,
    put: async (input, key) => {
      if (Array.isArray(input) && key !== undefined) {
        throw new TypeError(
          `[${label}] An explicit key can only be used with a single row.`
        )
      }
      const validated = (Array.isArray(input) ? input : [input]).map(
        validateForWrite
      )
      await write((store) => {
        for (const row of validated) {
          store.put(row, key)
        }
      })
    },
    delete: (keys) =>
      write((store) => {
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          store.delete(key)
        }
      }),
    clear: () => write((store) => store.clear()),
    query: query as IndexedDbTable<Row>['query'],
    db,
    storeName,
    '~': {
      schema: options.schema,
      subscribe,
      notify,
    },
  }
}

/**
 * Row store for `createIndexedDb({ stores })`: keyed rows, indexes, range
 * reads, validation. Use `query()` for a `Readable`/`Subscribable` that
 * re-runs on table changes. On the server, queries stay on `initial`.
 *
 * Key paths must name a schema field that can hold a key, and reads are typed
 * from that field. Compound (`['id', 'order']`) and nested (`'meta.slug'`)
 * paths fall back to `IDBValidKey`.
 *
 * @example Vanilla
 * ```ts twoslash title="todos.ts"
 * import { createIndexedDb, createIndexedDbTable } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const db = createIndexedDb({
 *   name: 'app',
 *   stores: {
 *     todos: createIndexedDbTable({
 *       keyPath: 'id',
 *       indexes: { status: 'status' },
 *       schema: z.object({ id: z.string(), title: z.string(), status: z.enum(['open', 'done']) }),
 *     }),
 *   },
 * })
 * const { todos } = db.stores
 *
 * await todos.put({ id: '1', title: 'Write docs', status: 'open' })
 * await todos.get('1') // { id: '1', title: 'Write docs', status: 'open' }
 * await todos.getAll()
 * await todos.index('status').getAll('open') // index names and keys are typed
 * await todos.delete('1')
 *
 * const open = todos.query(t => t.index('status').getAll('open'), { initial: [] })
 * open.get() // [] until the first run settles
 * open.subscribe(rows => console.log(rows)) // re-runs after every write
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import { createIndexedDb, createIndexedDbTable } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const db = createIndexedDb({
 *   name: 'app',
 *   stores: {
 *     todos: createIndexedDbTable({
 *       keyPath: 'id',
 *       schema: z.object({ id: z.string(), title: z.string(), status: z.enum(['open', 'done']) }),
 *     }),
 *   },
 * })
 *
 * const allTodos = db.stores.todos.query(t => t.getAll(), { initial: [] })
 *
 * export default function Page() {
 *   const rows = useSubscription(allTodos)
 *   return (
 *     <ul>
 *       {rows.map(todo => <li key={todo.id}>{todo.title}</li>)}
 *     </ul>
 *   )
 * }
 * ```
 */
export function createIndexedDbTable<
  S extends StandardSchemaV1<unknown>,
  const Definition extends IndexedDbStoreDefinition<
    StandardSchemaV1.InferOutput<S>
  >,
>(
  options: IndexedDbTableOptions<S> & Definition
): IndexedDbTableDefinition<S, Definition> {
  return {
    '~': {
      definition: {
        keyPath: options.keyPath,
        autoIncrement: options.autoIncrement,
        indexes: options.indexes,
      },
      create: (db, storeName) => createTable(options, db, storeName),
    },
  }
}
