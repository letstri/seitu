export interface IndexedDbIndexDefinition {
  keyPath: string | string[]
  unique?: boolean
  multiEntry?: boolean
}

export interface IndexedDbStoreDefinition {
  /** Primary key path. Omit for out-of-line keys (pass key to `put`). */
  keyPath?: string | string[]
  autoIncrement?: boolean
  /** A string is `{ keyPath: value }`. */
  indexes?: Record<string, string | string[] | IndexedDbIndexDefinition>
}

/**
 * Handle bound to one database and object store. Storages expose `hydrate`
 * for `IndexedDb.ready`; tables do not.
 */
export interface IndexedDbStoreHandle {
  db: IndexedDb
  storeName: string
  /** Awaited by `IndexedDb.ready`. Must not reject. */
  hydrate?: () => Promise<unknown>
}

/**
 * Store definition plus handle factory. Returned by `createIndexedDbStorage`
 * / `createIndexedDbTable`.
 */
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

export interface IndexedDbUpgradeContext {
  database: IDBDatabase
  transaction: IDBTransaction
  oldVersion: number
  newVersion: number | null
}

export interface IndexedDbOptions<Stores extends IndexedDbStores> {
  name: string
  /**
   * Minimum version. Auto-bumped when a declared store/index is missing; set
   * this for `onUpgrade` migrations.
   */
  version?: number
  stores: Stores
  /** Runs in the `versionchange` transaction after declared stores/indexes are created. */
  onUpgrade?: (context: IndexedDbUpgradeContext) => void
}

export interface IndexedDb<Stores extends IndexedDbStores = IndexedDbStores> {
  /**
   * Resolves when the connection is open, stores exist, and storages have
   * hydrated. Never rejects.
   */
  ready: Promise<void>
  /** Close the connection; it reopens on next access. */
  close: () => void
  stores: IndexedDbStoreHandles<Stores>
  '~': {
    name: string
    getDatabase: () => Promise<IDBDatabase>
  }
}

type StoreDefinitions = Record<string, IndexedDbStoreDefinition>

const MAX_UPGRADE_ATTEMPTS = 5

// Serialize open/upgrade per name so concurrent handles cannot race upgrades.
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
      // Version already advanced (e.g. another tab); reopen at the current version.
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

    // Missing store/index: bump version so onupgradeneeded runs.
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
          // Close so another connection can upgrade; reopen lazily.
          database.onversionchange = () => {
            database.close()
            if (databasePromise === promise) {
              databasePromise = undefined
            }
          }
          return database
        })
        // Drop rejected opens so the next call can retry.
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
