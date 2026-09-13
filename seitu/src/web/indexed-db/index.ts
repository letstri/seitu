import type { IndexedDbTable } from '../indexed-db-table'

type IndexedDbKeyField<Row> = {
  [K in keyof Row & string]: Exclude<Row[K], undefined> extends IDBValidKey
    ? K
    : never
}[keyof Row & string]

export type IndexedDbKeyPath<Row> = Row extends object
  ?
      | ([IndexedDbKeyField<Row>] extends [never]
          ? keyof Row & string
          : IndexedDbKeyField<Row>)
      | `${keyof Row & string}.${string}`
  : string

export interface IndexedDbIndexDefinition<Row = unknown> {
  keyPath: IndexedDbKeyPath<Row> | IndexedDbKeyPath<Row>[]
  unique?: boolean
  multiEntry?: boolean
}

export interface IndexedDbStoreDefinition<Row = unknown> {
  keyPath?: IndexedDbKeyPath<Row> | IndexedDbKeyPath<Row>[]
  autoIncrement?: boolean
  indexes?: Record<
    string,
    | IndexedDbKeyPath<Row>
    | IndexedDbKeyPath<Row>[]
    | IndexedDbIndexDefinition<Row>
  >
}

export interface IndexedDbStoreHandle {
  db: IndexedDb
  storeName: string
  hydrate?: () => Promise<unknown>
}

export interface IndexedDbStore<
  Handle extends IndexedDbStoreHandle = IndexedDbStoreHandle,
> {
  '~': {
    definition: IndexedDbStoreDefinition
    create: (db: IndexedDb, storeName: string) => Handle
  }
}

export type IndexedDbStores = Record<string, IndexedDbStore>

export type IndexedDbStoreHandles<Stores extends IndexedDbStores> = {
  [K in keyof Stores]: Stores[K] extends IndexedDbStore<infer Handle>
    ? Handle
    : never
}

type RowOf<Store> =
  Store extends IndexedDbStore<IndexedDbTable<infer Row, any>> ? Row : unknown

export type IndexedDbMigrateRow<Row> = (
  row: Row & Record<string, unknown>,
  key: IDBValidKey
) => Row | null | void

export interface IndexedDbUpgradeContext<
  Stores extends IndexedDbStores = IndexedDbStores,
> {
  database: IDBDatabase
  transaction: IDBTransaction
  oldVersion: number
  newVersion: number | null
  migrate: <Name extends keyof Stores & string>(
    name: Name,
    rewrite: IndexedDbMigrateRow<RowOf<Stores[Name]>>
  ) => void
}

export interface IndexedDbOptions<Stores extends IndexedDbStores> {
  name: string
  version?: number
  stores: Stores
  onUpgrade?: (context: IndexedDbUpgradeContext<Stores>) => void
}

export interface IndexedDb<Stores extends IndexedDbStores = IndexedDbStores> {
  ready: Promise<void>
  close: () => void
  stores: IndexedDbStoreHandles<Stores>
  '~': {
    name: string
    getDatabase: () => Promise<IDBDatabase>
  }
}

type StoreDefinitions = Record<string, IndexedDbStoreDefinition>

const MAX_UPGRADE_ATTEMPTS = 5

const openLocks = new Map<string, Promise<unknown>>()

function withOpenLock<T>(name: string, run: () => Promise<T>): Promise<T> {
  const previous = openLocks.get(name) ?? Promise.resolve()
  const next = previous.then(run, run)
  openLocks.set(name, next)
  const release = () => {
    if (openLocks.get(name) === next) {
      openLocks.delete(name)
    }
  }
  next.then(release, release)
  return next
}

function normalizeIndex(
  definition: string | string[] | IndexedDbIndexDefinition
): IndexedDbIndexDefinition {
  return typeof definition === 'string' || Array.isArray(definition)
    ? { keyPath: definition }
    : definition
}

function ensureStores(
  database: IDBDatabase,
  transaction: IDBTransaction,
  stores: StoreDefinitions
) {
  for (const [storeName, definition] of Object.entries(stores)) {
    let store: IDBObjectStore

    if (database.objectStoreNames.contains(storeName)) {
      store = transaction.objectStore(storeName)
    } else {
      store = database.createObjectStore(storeName, {
        keyPath: definition.keyPath,
        autoIncrement: definition.autoIncrement,
      })
    }

    for (const [indexName, indexDefinition] of Object.entries(
      definition.indexes ?? {}
    )) {
      if (store.indexNames.contains(indexName)) {
        continue
      }
      const { keyPath, ...parameters } = normalizeIndex(indexDefinition)
      store.createIndex(indexName, keyPath, parameters)
    }
  }
}

function findMissing(
  database: IDBDatabase,
  stores: StoreDefinitions
): string | undefined {
  for (const [storeName, definition] of Object.entries(stores)) {
    if (!database.objectStoreNames.contains(storeName)) {
      return storeName
    }

    const indexNames = Object.keys(definition.indexes ?? {})
    if (indexNames.length === 0) {
      continue
    }

    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    for (const indexName of indexNames) {
      if (!store.indexNames.contains(indexName)) {
        return `${storeName}.${indexName}`
      }
    }
  }
  return undefined
}

function migrateStore(
  transaction: IDBTransaction,
  storeName: string,
  rewrite: IndexedDbMigrateRow<any>,
  label: string
) {
  const request = transaction.objectStore(storeName).openCursor()
  request.onerror = () => {
    console.error(
      `[${label}] Could not read "${storeName}" to migrate it.`,
      request.error
    )
  }
  request.onsuccess = () => {
    const cursor = request.result
    if (!cursor) {
      return
    }
    const next = rewrite(cursor.value, cursor.key)
    if (next === null) {
      cursor.delete()
    } else if (next !== undefined) {
      cursor.update(next)
    }
    cursor.continue()
  }
}

interface OpenOptions {
  name: string
  version?: number
  stores: StoreDefinitions
  onUpgrade?: (context: IndexedDbUpgradeContext) => void
}

function openRequest(
  options: OpenOptions,
  version: number | undefined,
  label: string
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(options.name, version)

    request.onupgradeneeded = (event) => {
      const database = request.result
      const transaction = request.transaction!
      ensureStores(database, transaction, options.stores)
      options.onUpgrade?.({
        database,
        transaction,
        oldVersion: event.oldVersion,
        newVersion: event.newVersion,
        migrate: (storeName, rewrite) =>
          migrateStore(transaction, storeName, rewrite, label),
      })
    }
    request.onblocked = () => {
      console.warn(
        `[${label}] Upgrade is blocked by another open connection. Waiting for it to close.`
      )
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function openDatabase(
  options: OpenOptions,
  label: string
): Promise<IDBDatabase> {
  let version = options.version

  for (let attempt = 0; attempt < MAX_UPGRADE_ATTEMPTS; attempt++) {
    let database: IDBDatabase
    try {
      database = await openRequest(options, version, label)
    } catch (error) {
      if (
        version !== undefined &&
        (error as { name?: string } | null)?.name === 'VersionError'
      ) {
        version = undefined
        continue
      }
      throw error
    }

    const missing = findMissing(database, options.stores)
    if (!missing) {
      return database
    }

    version = database.version + 1
    database.close()
  }

  throw new Error(
    `[${label}] Could not create the declared object stores after ${MAX_UPGRADE_ATTEMPTS} attempts.`
  )
}

/**
 * Opens one IndexedDB connection and builds a handle for each store definition
 * (`createIndexedDbStorage` or `createIndexedDbTable`). Missing stores/indexes
 * are created automatically; concurrent opens of the same name are serialized.
 *
 * `version` is a minimum, not a pin: adding a store or an index bumps it on its
 * own, so set it only when existing rows need migrating. Bump it, then rewrite
 * the rows with `migrate` in `onUpgrade`, which runs inside the `versionchange`
 * transaction after the declared stores and indexes are created. Everything
 * there is synchronous — `migrate` queues a cursor walk instead of returning a
 * promise, and `onUpgrade` cannot be `async`.
 *
 * `migrate` rewrites fields, not keys: changing the `keyPath` field of a row
 * aborts the upgrade. Indexes are created and filled before `onUpgrade` runs,
 * so a migration cannot clean up rows for a `unique` index added in the same
 * version — add the index in a later version than the cleanup. A failed
 * upgrade rolls back whole and is reported with `console.warn`: `ready` still
 * resolves, but reads and writes then reject, because every access retries the
 * same failing upgrade.
 *
 * @example Vanilla
 * ```ts twoslash title="db.ts"
 * import { createIndexedDb, createIndexedDbStorage, createIndexedDbTable } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const db = createIndexedDb({
 *   name: 'app',
 *   stores: {
 *     settings: createIndexedDbStorage({
 *       schemas: { theme: z.enum(['light', 'dark']) },
 *       defaultValues: { theme: 'light' },
 *     }),
 *     todos: createIndexedDbTable({
 *       keyPath: 'id',
 *       indexes: { status: 'status' },
 *       schema: z.object({ id: z.string(), title: z.string(), status: z.enum(['open', 'done']) }),
 *     }),
 *   },
 * })
 *
 * const { settings, todos } = db.stores
 *
 * settings.get() // { theme: 'light' } until hydrated
 * await db.ready // connection open, settings hydrated
 * await todos.put({ id: '1', title: 'Write docs', status: 'open' })
 * ```
 *
 * @example Migrations
 * ```ts twoslash title="db.ts"
 * import { createIndexedDb, createIndexedDbTable } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const db = createIndexedDb({
 *   name: 'app',
 *   version: 2, // v1 rows have no `priority`
 *   stores: {
 *     todos: createIndexedDbTable({
 *       keyPath: 'id',
 *       indexes: { priority: 'priority' },
 *       schema: z.object({ id: z.string(), title: z.string(), priority: z.number() }),
 *     }),
 *   },
 *   onUpgrade: ({ oldVersion, migrate }) => {
 *     if (oldVersion < 2) {
 *       // Store names and rows are typed from `stores`.
 *       migrate('todos', row => ({ ...row, priority: row.priority ?? 0 }))
 *       // Return `null` to drop a row, nothing to keep it as is.
 *     }
 *   },
 * })
 *
 * await db.ready // upgrade finished, rows migrated
 * ```
 */
export function createIndexedDb<const Stores extends IndexedDbStores>(
  options: IndexedDbOptions<Stores>
): IndexedDb<Stores> {
  const label = `createIndexedDb:${options.name}`
  const isSupported = typeof indexedDB !== 'undefined'
  const openOptions: OpenOptions = {
    name: options.name,
    version: options.version,
    onUpgrade: options.onUpgrade,
    stores: Object.fromEntries(
      Object.entries(options.stores).map(([storeName, store]) => [
        storeName,
        store['~'].definition,
      ])
    ),
  }

  let databasePromise: Promise<IDBDatabase> | undefined

  const getDatabase = () => {
    if (!isSupported) {
      return Promise.reject(
        new Error(`[${label}] IndexedDB is not available in this environment.`)
      )
    }

    if (!databasePromise) {
      const promise = withOpenLock(options.name, () =>
        openDatabase(openOptions, label)
      )
        .then((database) => {
          database.onversionchange = () => {
            database.close()
            if (databasePromise === promise) {
              databasePromise = undefined
            }
          }
          return database
        })
        .catch((error) => {
          if (databasePromise === promise) {
            databasePromise = undefined
          }
          throw error
        })
      databasePromise = promise
    }
    return databasePromise
  }

  const close = () => {
    const promise = databasePromise
    if (!promise) {
      return
    }
    databasePromise = undefined
    promise.then(
      (database) => database.close(),
      () => {}
    )
  }

  const handles = {} as IndexedDbStoreHandles<Stores>

  const ready: Promise<void> = isSupported
    ? getDatabase()
        .then(() =>
          Promise.all(
            Object.values(handles).map((handle) => handle.hydrate?.())
          )
        )
        .then(
          () => {},
          (error) => {
            console.warn(`[${label}] Failed to open IndexedDB.`, error)
          }
        )
    : Promise.resolve()

  const db: IndexedDb<Stores> = {
    ready,
    close,
    stores: handles,
    '~': {
      name: options.name,
      getDatabase,
    },
  }

  for (const [storeName, store] of Object.entries(options.stores)) {
    handles[storeName as keyof Stores] = store['~'].create(
      db,
      storeName
    ) as IndexedDbStoreHandles<Stores>[keyof Stores]
  }

  return db
}
