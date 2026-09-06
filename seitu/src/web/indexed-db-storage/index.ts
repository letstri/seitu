import type { StandardSchemaV1 } from '@standard-schema/spec'
import { deepEqual } from 'fast-equals'

import type {
  Clearable,
  ServerReadable,
  Subscribable,
  Writable,
} from '../../core'
import { createReadableSubscription, createSubscription } from '../../core'
import {
  createBroadcaster,
  requestToPromise,
  transactionDone,
} from '../../internal/indexed-db-request'
import type { ValidationSchemaObjectErrorProps } from '../../internal/validate'
import { validateSchema } from '../../internal/validate'
import type {
  IndexedDb,
  IndexedDbStore,
  IndexedDbStoreHandle,
} from '../indexed-db'
import type { WebStorageInput, WebStorageOutput } from '../web-storage'

export interface IndexedDbStorageOptions<S extends WebStorageInput> {
  schemas: S
  defaultValues: WebStorageOutput<S>
  keyTransform?: (key: keyof S) => string
  onValidationError?: (
    props: ValidationSchemaObjectErrorProps<WebStorageOutput<S>>
  ) => void | StandardSchemaV1.InferOutput<S[keyof S]>
}

export interface IndexedDbStorage<O extends Record<string, unknown>>
  extends
    Subscribable<O>,
    ServerReadable<O>,
    Writable<Partial<O>, O>,
    Clearable,
    IndexedDbStoreHandle {
  /** Update the cache now; persist asynchronously. Never rejects. */
  set: (value: Partial<O> | ((prev: O) => Partial<O>)) => Promise<void>
  /** Reset cache to defaults; delete keys asynchronously. Never rejects. */
  clear: () => Promise<void>
  /** Never rejects. */
  hydrate: () => Promise<O>
  '~': {
    getDefaultValue: <K extends keyof O>(key: K) => O[K]
    getSchema: (key: keyof O) => StandardSchemaV1<unknown>
    transformKey: (key: keyof O) => string
  } & Subscribable<O>['~']
}

/** Pass to `createIndexedDb({ stores })`; handle is on `db.stores`. */
export type IndexedDbStorageDefinition<S extends WebStorageInput> =
  IndexedDbStore<IndexedDbStorage<WebStorageOutput<S>>>

function createStorage<S extends WebStorageInput>(
  options: IndexedDbStorageOptions<S>,
  db: IndexedDb,
  storeName: string
): IndexedDbStorage<WebStorageOutput<S>> {
  type O = WebStorageOutput<S>

  const defaultValues = { ...options.defaultValues }
  const keys = Object.keys(options.defaultValues) as (keyof O)[]
  const isSupported = typeof indexedDB !== 'undefined'
  const databaseName = db['~'].name
  const label = `createIndexedDbStorage:${databaseName}/${storeName}`
  const { broadcast, listen } = createBroadcaster(
    `seitu:indexed-db:${databaseName}:${storeName}`
  )

  const resolveKey = (key: keyof O) =>
    String(options.keyTransform ? options.keyTransform(key) : key)

  let cache = { ...options.defaultValues } as O
  // Per-key write seq so hydrate cannot overwrite a newer local write.
  let writeVersion = 0
  const keyWriteVersion = new Map<keyof O, number>()
  // Hydrate seq so slower out-of-order reads can bail out.
  let hydrateSeq = 0

  const markWritten = (written: Iterable<keyof O>) => {
    writeVersion++
    for (const key of written) {
      keyWriteVersion.set(key, writeVersion)
    }
  }

  // Set after hydrate exists to break the subscribe/hydrate cycle.
  let triggerHydrate = () => {}

  const { subscribe, notify } = createSubscription({
    onFirstSubscribe: () => {
      // Catch writes that landed before this subscriber (e.g. another tab).
      triggerHydrate()

      return listen(() => triggerHydrate())
    },
  })

  const validateValue = (key: keyof O, raw: unknown): O[keyof O] => {
    if (raw === undefined) {
      return options.defaultValues[key]
    }

    return validateSchema(options.schemas[key as keyof S], raw, {
      defaultValue: options.defaultValues[key],
      label: `createIndexedDbStorage:${String(key)}`,
      key,
      onError: options.onValidationError,
    }) as O[keyof O]
  }

  const hydrate = async (): Promise<O> => {
    if (!isSupported) {
      return cache
    }

    const seq = ++hydrateSeq
    const startVersion = writeVersion

    const database = await db['~'].getDatabase()
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const persisted = {} as O

    await Promise.all(
      keys.map(async (key) => {
        persisted[key] = validateValue(
          key,
          await requestToPromise(store.get(resolveKey(key)))
        )
      })
    )

    if (seq !== hydrateSeq) {
      return cache
    }

    // Keep values written while the read was in flight.
    const next = {} as O
    for (const key of keys) {
      next[key] =
        (keyWriteVersion.get(key) ?? 0) > startVersion
          ? cache[key]
          : persisted[key]
    }

    if (!deepEqual(cache, next)) {
      cache = next
      notify()
    }

    return cache
  }

  const safeHydrate = (): Promise<O> =>
    hydrate().catch((error) => {
      console.warn(
        `[${label}] Failed to read from IndexedDB, using cached values.`,
        error
      )
      return cache
    })

  let ready: Promise<O> | undefined
  let inFlight: Promise<O> | undefined
  const rehydrate = () => {
    if (!inFlight) {
      const run = safeHydrate().finally(() => {
        if (inFlight === run) {
          inFlight = undefined
        }
      })
      inFlight = run
      ready = run
    }
    return inFlight
  }
  const ensureReady = () => ready ?? rehydrate()

  triggerHydrate = () => void rehydrate()

  const get = () => {
    ensureReady()
    return cache
  }

  const readable = createReadableSubscription(
    get,
    subscribe,
    notify,
    () => defaultValues
  )

  const persist = async (mutate: (store: IDBObjectStore) => void) => {
    if (!isSupported) {
      return
    }

    try {
      const database = await db['~'].getDatabase()
      const transaction = database.transaction(storeName, 'readwrite')
      mutate(transaction.objectStore(storeName))
      await transactionDone(transaction)
      broadcast()
    } catch (error) {
      console.warn(`[${label}] Failed to write to IndexedDB.`, error)
    }
  }

  return {
    ...readable,
    set: (value) => {
      ensureReady()
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
    clear: () => {
      ensureReady()
      markWritten(keys)
      cache = { ...options.defaultValues }
      notify()

      return persist((store) => {
        for (const key of keys) {
          store.delete(resolveKey(key))
        }
      })
    },
    hydrate: rehydrate,
    db,
    storeName,
    '~': {
      ...readable['~'],
      getDefaultValue: (key) => defaultValues[key],
      getSchema: (key) => options.schemas[key as keyof S],
      transformKey: resolveKey,
    },
  }
}

/**
 * Key/value store for `createIndexedDb({ stores })`. `get()` reads an
 * in-memory cache hydrated from IndexedDB (`await db.ready`). `set`/`clear`
 * update the cache now and persist later. SSR snapshot is `defaultValues`.
 *
 * @example Vanilla
 * ```ts twoslash title="settings-storage.ts"
 * import { createIndexedDb, createIndexedDbStorage } from 'seitu/web'
 * import * as z from 'zod'
 *
 * const db = createIndexedDb({
 *   name: 'app',
 *   stores: {
 *     settings: createIndexedDbStorage({
 *       schemas: {
 *         token: z.string().nullable(),
 *         preferences: z.object({ theme: z.enum(['light', 'dark']) }),
 *       },
 *       defaultValues: { token: null, preferences: { theme: 'light' } },
 *     }),
 *   },
 * })
 * const { settings } = db.stores
 *
 * settings.get() // { token: null, preferences: { theme: 'light' } }
 * await db.ready // value hydrated from IndexedDB
 * await settings.set({ token: 'abc' })
 * settings.get() // { token: 'abc', preferences: { theme: 'light' } }
 * settings.subscribe(console.log)
 * ```
 *
 * @example React
 * ```tsx twoslash title="page.tsx"
 * 'use client'
 *
 * import { createIndexedDb, createIndexedDbStorage } from 'seitu/web'
 * import { useSubscription } from 'seitu/react'
 * import * as z from 'zod'
 *
 * const db = createIndexedDb({
 *   name: 'app',
 *   stores: {
 *     settings: createIndexedDbStorage({
 *       schemas: { count: z.number(), name: z.string() },
 *       defaultValues: { count: 0, name: '' },
 *     }),
 *   },
 * })
 *
 * export default function Page() {
 *   const value = useSubscription(db.stores.settings)
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
  options: IndexedDbStorageOptions<S>
): IndexedDbStorageDefinition<S> {
  return {
    '~': {
      definition: {},
      create: (db, storeName) => createStorage(options, db, storeName),
    },
  }
}
