import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import * as z from 'zod'

import { createIndexedDbStorage } from '../indexed-db-storage'
import { createIndexedDbTable } from '../indexed-db-table'
import type { IndexedDbStoreDefinition } from './index'
import { createIndexedDb } from './index'

function storeNames(database: IDBDatabase): string[] {
  return [...database.objectStoreNames].sort()
}

function indexNames(database: IDBDatabase, storeName: string): string[] {
  return [
    ...database.transaction(storeName, 'readonly').objectStore(storeName)
      .indexNames,
  ].sort()
}

const table = (definition: IndexedDbStoreDefinition = {}) =>
  createIndexedDbTable({ schema: z.unknown(), ...definition })

describe('createIndexedDb', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory())
  })

  it('creates every declared store and index on first open', async () => {
    const db = createIndexedDb({
      name: 'app',
      stores: {
        settings: createIndexedDbStorage({
          schemas: { theme: z.string() },
          defaultValues: { theme: 'light' },
        }),
        todos: table({
          keyPath: 'id',
          indexes: { done: 'done', createdAt: { keyPath: 'createdAt' } },
        }),
      },
    })
    const database = await db['~'].getDatabase()

    expect(database.version).toBe(1)
    expect(storeNames(database)).toEqual(['settings', 'todos'])
    expect(indexNames(database, 'todos')).toEqual(['createdAt', 'done'])
  })

  it('ready waits for storages to hydrate', async () => {
    const settings = createIndexedDbStorage({
      schemas: { theme: z.string() },
      defaultValues: { theme: 'light' },
    })
    const seed = createIndexedDb({ name: 'app', stores: { settings } })
    await seed.stores.settings.set({ theme: 'dark' })

    const db = createIndexedDb({ name: 'app', stores: { settings } })
    expect(db.stores.settings.get()).toEqual({ theme: 'light' })
    await db.ready
    expect(db.stores.settings.get()).toEqual({ theme: 'dark' })
  })

  it('builds one handle per definition under stores', async () => {
    const db = createIndexedDb({
      name: 'app',
      stores: {
        settings: createIndexedDbStorage({
          schemas: { theme: z.string() },
          defaultValues: { theme: 'light' },
        }),
        todos: table({ keyPath: 'id' }),
      },
    })
    const { settings, todos } = db.stores

    expectTypeOf(settings.get()).toEqualTypeOf<{ theme: string }>()
    expect(settings.db).toBe(db)
    expect(settings.storeName).toBe('settings')
    expect(todos.db).toBe(db)
    expect(todos.storeName).toBe('todos')
    await db.ready
  })

  it('reuses one definition across databases', async () => {
    const todos = table({ keyPath: 'id' })
    const a = createIndexedDb({ name: 'a', stores: { todos } })
    const b = createIndexedDb({ name: 'b', stores: { todos } })
    expect(a.stores.todos).not.toBe(b.stores.todos)
    await Promise.all([a.ready, b.ready])
  })

  it('bumps the version and adds stores missing from an existing database', async () => {
    const first = createIndexedDb({ name: 'app', stores: { a: table() } })
    await first.ready

    const second = createIndexedDb({
      name: 'app',
      stores: { a: table(), b: table({ keyPath: 'id' }) },
    })
    const database = await second['~'].getDatabase()

    expect(database.version).toBe(2)
    expect(storeNames(database)).toEqual(['a', 'b'])
  })

  it('bumps the version and adds indexes missing from an existing store', async () => {
    const first = createIndexedDb({
      name: 'app',
      stores: { todos: table({ keyPath: 'id' }) },
    })
    await first.ready

    const second = createIndexedDb({
      name: 'app',
      stores: { todos: table({ keyPath: 'id', indexes: { done: 'done' } }) },
    })
    const database = await second['~'].getDatabase()

    expect(database.version).toBe(2)
    expect(indexNames(database, 'todos')).toEqual(['done'])
  })

  it('serializes concurrent handles for the same database so none loses its store', async () => {
    const seed = createIndexedDb({ name: 'app', stores: { x: table() } })
    await seed.ready

    const a = createIndexedDb({ name: 'app', stores: { a: table() } })
    const b = createIndexedDb({ name: 'app', stores: { b: table() } })
    const c = createIndexedDb({ name: 'app', stores: { c: table() } })
    const [da, dbb, dc] = await Promise.all([
      a['~'].getDatabase(),
      b['~'].getDatabase(),
      c['~'].getDatabase(),
    ])

    expect(da.objectStoreNames.contains('a')).toBe(true)
    expect(dbb.objectStoreNames.contains('b')).toBe(true)
    expect(dc.objectStoreNames.contains('c')).toBe(true)
  })

  it('treats version as a minimum and runs onUpgrade inside the versionchange transaction', async () => {
    const onUpgrade = vi.fn()
    const db = createIndexedDb({
      name: 'app',
      version: 3,
      stores: { a: table() },
      onUpgrade,
    })
    const database = await db['~'].getDatabase()

    expect(database.version).toBe(3)
    expect(onUpgrade).toHaveBeenCalledOnce()
    expect(onUpgrade.mock.calls[0]![0]).toMatchObject({
      oldVersion: 0,
      newVersion: 3,
    })
    expect(onUpgrade.mock.calls[0]![0].transaction.mode).toBe('versionchange')
  })

  it('recovers when the pinned version is lower than the existing one', async () => {
    const newer = createIndexedDb({
      name: 'app',
      version: 5,
      stores: { a: table() },
    })
    await newer.ready

    const older = createIndexedDb({
      name: 'app',
      version: 2,
      stores: { a: table(), b: table() },
    })
    const database = await older['~'].getDatabase()

    expect(database.version).toBe(6)
    expect(storeNames(database)).toEqual(['a', 'b'])
  })

  it('reopens lazily after another connection upgrades the database', async () => {
    const a = createIndexedDb({ name: 'app', stores: { a: table() } })
    const first = await a['~'].getDatabase()

    const b = createIndexedDb({
      name: 'app',
      stores: { a: table(), b: table() },
    })
    await b.ready

    const second = await a['~'].getDatabase()
    expect(second).not.toBe(first)
    expect(second.version).toBe(2)
  })

  it('reopens after close()', async () => {
    const db = createIndexedDb({ name: 'app', stores: { a: table() } })
    const first = await db['~'].getDatabase()
    db.close()
    const second = await db['~'].getDatabase()
    expect(second).not.toBe(first)
    expect(storeNames(second)).toEqual(['a'])
  })

  it('resolves ready and rejects getDatabase when IndexedDB is unavailable (SSR)', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const db = createIndexedDb({ name: 'app', stores: { a: table() } })
    await expect(db.ready).resolves.toBeUndefined()
    await expect(db['~'].getDatabase()).rejects.toThrow(
      'IndexedDB is not available'
    )
  })

  it('never rejects ready when opening fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('indexedDB', {
      open: () => {
        const request = {
          onupgradeneeded: null,
          onblocked: null,
          onsuccess: null,
          onerror: null as null | (() => void),
          error: new Error('boom'),
        }
        queueMicrotask(() => request.onerror?.())
        return request
      },
    })
    const db = createIndexedDb({ name: 'app', stores: { a: table() } })
    await expect(db.ready).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to open IndexedDB'),
      expect.anything()
    )
    warn.mockRestore()
  })
})
