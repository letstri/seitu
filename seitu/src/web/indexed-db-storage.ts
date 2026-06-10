import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Clearable, Readable, Subscribable, Writable } from '../core/index'
import type { ValidationSchemaObjectErrorProps } from '../validate'
import type { WebStorageInput, WebStorageOutput } from './web-storage'
import { deepEqual } from 'fast-equals'
import { createReadableSubscription, createSubscription } from '../core/index'
import { validateSchema } from '../validate'

export interface IndexedDbStorageOptions<S extends WebStorageInput> {
  schemas: S
  defaultValues: WebStorageOutput<S>
  /**
   * Name of the IndexedDB database to open.
   */
  databaseName: string
  /**
   * Name of the object store used to persist values.
   *
   * @default 'seitu'
   */
  storeName?: string
  /**
   * Version of the IndexedDB database. Leave unset to let the storage manage
   * the version automatically (it bumps the version when it needs to create
   * its object store).
   */
  version?: number
  keyTransform?: (key: keyof S) => string
  onValidationError?: (props: ValidationSchemaObjectErrorProps<WebStorageOutput<S>>) => void | StandardSchemaV1.InferOutput<S[keyof S]>
}

export interface IndexedDbStorage<O extends Record<string, unknown>> extends Subscribable<O>, Readable<O>, Writable<Partial<O>, O>, Clearable {
  /**
   * Resolves once the initial value has been read from IndexedDB.
   *
   * Because IndexedDB is asynchronous, `get()` returns the in-memory cache
   * (the default values until hydration completes). Await `ready` to read the
   * persisted value. This promise never rejects — read failures fall back to
   * the default values and are logged.
   */
  'ready': Promise<O>
  /**
   * Updates the in-memory cache synchronously (so `get()` reflects the change
   * immediately) and persists to IndexedDB asynchronously. The returned promise
   * resolves once persistence settles and never rejects.
   */
  'set': (value: Partial<O> | ((prev: O) => Partial<O>)) => Promise<void>
  /**
   * Resets the cache to the default values synchronously and removes the managed
   * keys from IndexedDB asynchronously. The returned promise resolves once
   * persistence settles and never rejects.
   */
  'clear': () => Promise<void>
  '~': {
    getDefaultValue: <K extends keyof O>(key: K) => O[K]
    databaseName: string
    storeName: string
  } & Subscribable<O>['~']
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function openRequest(name: string, version: number | undefined, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = version === undefined ? indexedDB.open(name) : indexedDB.open(name, version)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    // `blocked` is non-terminal: wait for the other connection to close, then `success`/`error` fires.
  })
}

async function openDatabase(name: string, storeName: string, version?: number): Promise<IDBDatabase> {
  const db = await openRequest(name, version, storeName)

  if (db.objectStoreNames.contains(storeName)) {
    return db
  }

  // The store is missing (the database was created elsewhere). Bump the version
  // to add it, unless the caller pinned a specific version.
  if (version !== undefined) {
    return db
  }

  const nextVersion = db.version + 1
  db.close()
  return openRequest(name, nextVersion, storeName)
}

/**
 * Creates a reactive handle for an IndexedDB object store.
 *
 * IndexedDB is asynchronous, so the handle keeps an in-memory cache that
 * `get()` reads synchronously. The cache is hydrated from IndexedDB on
 * creation (await `ready` to know when), and changes made via `set()` /
 * `clear()` are persisted asynchronously. When `BroadcastChannel` is
 * available, changes are synced across tabs while there is at least one
 * subscriber.
 *
 * @example Vanilla
 * ```ts twoslash title="settings-storage.ts"
 * import { createIndexedDbStorage } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const settingsStorage = createIndexedDbStorage({
 *   databaseName: 'app',
 *   schemas: {
 *     token: z.string().nullable(),
 *     preferences: z.object({ theme: z.enum(['light', 'dark']) }),
 *   },
 *   defaultValues: { token: null, preferences: { theme: 'light' } },
 * })
 *
 * settingsStorage.get() // { token: null, preferences: { theme: 'light' } }
 * await settingsStorage.ready // value hydrated from IndexedDB
 * await settingsStorage.set({ token: 'abc' })
 * settingsStorage.get() // { token: 'abc', preferences: { theme: 'light' } }
 * settingsStorage.subscribe(console.log)
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import { createIndexedDbStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const settingsStorage = createIndexedDbStorage({
 *   databaseName: 'app',
 *   schemas: { count: z.number(), name: z.string() },
 *   defaultValues: { count: 0, name: '' },
 * })
 *
 * export default function Page() {
 *   const value = useSubscription(settingsStorage)
 *   return (
 *     <div>
 *       <span>{value.count}</span>
 *       <span>{value.name}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function createIndexedDbStorage<S extends WebStorageInput>(
  options: IndexedDbStorageOptions<S>,
): IndexedDbStorage<WebStorageOutput<S>> {
  type O = WebStorageOutput<S>

  const defaultValues = { ...options.defaultValues }
  const storeName = options.storeName ?? 'seitu'
  const keys = Object.keys(options.defaultValues) as (keyof O)[]
  const isSupported = typeof indexedDB !== 'undefined'
  const channelName = `seitu:indexed-db:${options.databaseName}:${storeName}`
  const label = `createIndexedDbStorage:${options.databaseName}/${storeName}`

  const resolveKey = (key: keyof O) => String(options.keyTransform ? options.keyTransform(key) : key)

  let cache = { ...options.defaultValues } as O
  // Tracks the latest write per key so an in-flight hydrate never overwrites a
  // value that changed while it was reading.
  let writeVersion = 0
  const keyWriteVersion = new Map<keyof O, number>()
  // Tracks the latest hydrate so slower, out-of-order reads can bail out.
  let hydrateSeq = 0

  const markWritten = (written: Iterable<keyof O>) => {
    writeVersion++
    for (const key of written) {
      keyWriteVersion.set(key, writeVersion)
    }
  }

  // Shared by listener and sender: posting on this instance reaches other tabs
  // without re-notifying the current one (a channel ignores its own messages).
  let channel: BroadcastChannel | undefined
  // Assigned once `hydrate` exists; breaks the subscription/hydrate cycle.
  let triggerHydrate = () => {}

  const broadcast = () => {
    if (typeof BroadcastChannel === 'undefined') {
      return
    }

    if (channel) {
      channel.postMessage(null)
      return
    }

    const ephemeral = new BroadcastChannel(channelName)
    ephemeral.postMessage(null)
    ephemeral.close()
  }

  let dbPromise: Promise<IDBDatabase> | undefined
  const getDatabase = () => {
    if (!dbPromise) {
      dbPromise = openDatabase(options.databaseName, storeName, options.version)
        .then((db) => {
          // Yield to another connection that needs to upgrade, then reopen lazily.
          db.onversionchange = () => {
            db.close()
            dbPromise = undefined
          }
          return db
        })
        // Never cache a rejected promise, so a later call can retry.
        .catch((error) => {
          dbPromise = undefined
          throw error
        })
    }
    return dbPromise
  }

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe: () => {
      // Pick up changes made before this consumer subscribed (e.g. by another tab).
      triggerHydrate()

      if (typeof BroadcastChannel === 'undefined') {
        return
      }

      channel = new BroadcastChannel(channelName)
      channel.onmessage = () => triggerHydrate()

      return () => {
        channel?.close()
        channel = undefined
      }
    },
  })

  const validateValue = (key: keyof O, raw: unknown): O[keyof O] => {
    if (raw === undefined) {
      return options.defaultValues[key]
    }

    return validateSchema(options.schemas[key as keyof S], raw, {
      defaultValue: options.defaultValues[key],
      label: `createIndexedDbStorage:${String(key)}`,
      onError: options.onValidationError
        ? (issues, parsed) => options.onValidationError!({ issues: [...issues], key, value: parsed, defaultValue: options.defaultValues[key] })
        : undefined,
    }) as O[keyof O]
  }

  const hydrate = async (): Promise<O> => {
    if (!isSupported) {
      return cache
    }

    const seq = ++hydrateSeq
    const startVersion = writeVersion

    const db = await getDatabase()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const persisted = {} as O

    await Promise.all(keys.map(async (key) => {
      persisted[key] = validateValue(key, await requestToPromise(store.get(resolveKey(key))))
    }))

    // A newer hydrate started while we were reading; let it win.
    if (seq !== hydrateSeq) {
      return cache
    }

    const next = {} as O
    for (const key of keys) {
      // Prefer a value written locally during the read; what we read is already stale for it.
      const wasWrittenDuringRead = (keyWriteVersion.get(key) ?? 0) > startVersion
      next[key] = wasWrittenDuringRead ? cache[key] : persisted[key]
    }

    if (!deepEqual(cache, next)) {
      cache = next
      notify()
    }

    return cache
  }

  const safeHydrate = (): Promise<O> =>
    hydrate().catch((error) => {
      console.warn(`[${label}] Failed to read from IndexedDB, using cached values.`, error)
      return cache
    })

  triggerHydrate = () => void safeHydrate()

  const ready = safeHydrate()

  const get = () => cache

  const readable = createReadableSubscription(get, subscribe, notify)

  const persist = async (mutate: (store: IDBObjectStore) => void) => {
    if (!isSupported) {
      return
    }

    try {
      const db = await getDatabase()
      const transaction = db.transaction(storeName, 'readwrite')
      mutate(transaction.objectStore(storeName))
      await transactionDone(transaction)
      broadcast()
    }
    catch (error) {
      console.warn(`[${label}] Failed to write to IndexedDB.`, error)
    }
  }

  return {
    ...readable,
    ready,
    'set': (value) => {
      const resolved = typeof value === 'function' ? value(cache) : value

      markWritten(Object.keys(resolved) as (keyof O)[])
      cache = { ...cache, ...resolved }
      notify()

      return persist((store) => {
        for (const [key, entry] of Object.entries(resolved)) {
          store.put(entry, resolveKey(key as keyof O))
        }
      })
    },
    'clear': () => {
      markWritten(keys)
      cache = { ...options.defaultValues }
      notify()

      return persist((store) => {
        for (const key of keys) {
          store.delete(resolveKey(key))
        }
      })
    },
    '~': {
      ...readable['~'],
      getDefaultValue: key => defaultValues[key],
      databaseName: options.databaseName,
      storeName,
    },
  }
}
