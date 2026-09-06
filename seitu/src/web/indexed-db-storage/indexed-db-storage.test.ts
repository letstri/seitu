import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'

import { createIndexedDb } from '../indexed-db'
import type { WebStorageInput } from '../web-storage'
import type { IndexedDbStorage, IndexedDbStorageOptions } from './index'
import { createIndexedDbStorage } from './index'

function createStorage<S extends WebStorageInput>(
  options: IndexedDbStorageOptions<S>,
  name = 'test'
) {
  return createIndexedDb({
    name,
    stores: { settings: createIndexedDbStorage(options) },
  }).stores.settings
}

function hydrated<O extends Record<string, unknown>>(
  storage: IndexedDbStorage<O>
) {
  return storage.db.ready.then(() => storage.get())
}

describe('createIndexedDbStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory())
  })

  describe('get', () => {
    it('returns defaultValues synchronously before hydration', () => {
      const storage = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: 'default' },
      })
      expect(storage.get()).toEqual({ count: 0, name: 'default' })
    })

    it('returns defaultValues when indexedDB is undefined (SSR)', async () => {
      vi.stubGlobal('indexedDB', undefined)

      const storage = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: 'ssr-default' },
      })
      await expect(hydrated(storage)).resolves.toEqual({
        count: 0,
        name: 'ssr-default',
      })
      expect(storage.get()).toEqual({ count: 0, name: 'ssr-default' })
    })

    it('hydrates persisted values from IndexedDB', async () => {
      const a = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      await a.set({ count: 5, name: 'bob' })

      const b = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      await hydrated(b)
      expect(b.get()).toEqual({ count: 5, name: 'bob' })
    })

    it('calls onValidationError with key, parsed value, and issues', async () => {
      const seed = createStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      // @ts-expect-error test invalid value
      await seed.set({ count: 'invalid-number' })

      const onValidationError = vi.fn()
      const storage = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
        onValidationError,
      })

      await expect(hydrated(storage)).resolves.toEqual({ count: 0, name: '' })
      expect(onValidationError).toHaveBeenCalled()
    })

    it('returns repaired value when onValidationError returns a value', async () => {
      const seed = createStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      // @ts-expect-error test invalid value
      await seed.set({ count: 'invalid-number' })

      const storage = createStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
        onValidationError: ({ key }) => (key === 'count' ? 55 : undefined),
      })

      await expect(hydrated(storage)).resolves.toEqual({ count: 55 })
    })
  })

  describe('set', () => {
    it('updates the cache synchronously and persists asynchronously', async () => {
      const storage = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      const callback = vi.fn()
      storage.subscribe(callback)

      const promise = storage.set({ count: 5 })
      expect(storage.get()).toEqual({ count: 5, name: '' })
      expect(callback).toHaveBeenCalledOnce()
      await promise
    })

    it('supports updater functions', async () => {
      const storage = createStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 1 },
      })
      await storage.set((prev) => ({ count: prev.count + 1 }))
      expect(storage.get()).toEqual({ count: 2 })
    })
  })

  describe('clear', () => {
    it('resets to defaultValues and removes managed keys', async () => {
      const storage = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: 'default' },
      })
      await storage.set({ count: 42, name: 'alice' })
      expect(storage.get()).toEqual({ count: 42, name: 'alice' })

      await storage.clear()
      expect(storage.get()).toEqual({ count: 0, name: 'default' })

      const next = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: 'default' },
      })
      await hydrated(next)
      expect(next.get()).toEqual({ count: 0, name: 'default' })
    })

    it('notifies subscribers after clear', async () => {
      const storage = createStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      const callback = vi.fn()
      storage.subscribe(callback)

      await storage.set({ count: 5 })
      await storage.clear()
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('keyTransform', () => {
    it('persists values under transformed keys', async () => {
      const storage = createStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
        keyTransform: (key) => `prefix-${String(key)}`,
      })
      await storage.set({ count: 5 })

      const same = createStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
        keyTransform: (key) => `prefix-${String(key)}`,
      })
      await hydrated(same)
      expect(same.get()).toEqual({ count: 5 })

      const untransformed = createStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      await hydrated(untransformed)
      expect(untransformed.get()).toEqual({ count: 0 })
    })
  })

  describe('~', () => {
    it('exposes defaultValues and schema; db and storeName are top-level', () => {
      const db = createIndexedDb({
        name: 'app',
        stores: {
          prefs: createIndexedDbStorage({
            schemas: { count: z.number(), name: z.string() },
            defaultValues: { count: 0, name: '' },
          }),
        },
      })
      const storage = db.stores.prefs
      expect(storage['~'].getDefaultValue('count')).toBe(0)
      expect(storage['~'].getDefaultValue('name')).toBe('')
      expect(storage['~'].getSchema('count')).toBeDefined()
      expect(storage['~'].transformKey('count')).toBe('count')
      expect(storage.db).toBe(db)
      expect(storage.storeName).toBe('prefs')
    })
  })

  describe('write during hydration', () => {
    it('keeps locally-written keys without losing untouched persisted keys', async () => {
      const seed = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      await seed.set({ count: 5, name: 'bob' })

      const storage = createStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      // Write before the initial hydrate settles.
      const setPromise = storage.set({ count: 10 })

      await Promise.all([hydrated(storage), setPromise])

      // `count` keeps the local write; `name` keeps the persisted value.
      expect(storage.get()).toEqual({ count: 10, name: 'bob' })
    })
  })

  describe('with db', () => {
    it('shares one connection and persists into its store', async () => {
      const db = createIndexedDb({
        name: 'app',
        stores: {
          settings: createIndexedDbStorage({
            schemas: { theme: z.string() },
            defaultValues: { theme: 'light' },
          }),
          other: createIndexedDbStorage({
            schemas: { v: z.number() },
            defaultValues: { v: 0 },
          }),
        },
      })
      const storage = db.stores.settings
      await storage.set({ theme: 'dark' })

      expect(storage.getServer()).toEqual({ theme: 'light' })

      const database = await db['~'].getDatabase()
      const raw = await new Promise((resolve) => {
        const request = database
          .transaction('settings', 'readonly')
          .objectStore('settings')
          .get('theme')
        request.onsuccess = () => resolve(request.result)
      })
      expect(raw).toBe('dark')
    })

    it('sibling storages in one database do not see each other', async () => {
      const definition = createIndexedDbStorage({
        schemas: { value: z.string() },
        defaultValues: { value: '' },
      })
      const first = createIndexedDb({
        name: 'shared',
        stores: { a: definition, b: definition },
      })
      await first.stores.a.set({ value: 'from-a' })
      await first.stores.b.set({ value: 'from-b' })

      const second = createIndexedDb({
        name: 'shared',
        stores: { a: definition, b: definition },
      })
      await second.ready

      expect(second.stores.a.get()).toEqual({ value: 'from-a' })
      expect(second.stores.b.get()).toEqual({ value: 'from-b' })
    })
  })

  describe('resilience', () => {
    it('falls back to defaults and logs when reading fails (ready never rejects)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.stubGlobal('indexedDB', {
        open: () => {
          const request: Record<string, unknown> = {}
          queueMicrotask(() => {
            ;(request as { error: unknown }).error = new Error('open failed')
            ;(request.onerror as () => void)?.()
          })
          return request
        },
      })

      const storage = createStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })

      await expect(hydrated(storage)).resolves.toEqual({ count: 0 })
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})

describe('createIndexedDbStorage hydration', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory())
  })

  it('hydrates when the database opens, once', async () => {
    const read = vi.spyOn(IDBObjectStore.prototype, 'get')

    const db = createIndexedDb({
      name: 'lazy',
      stores: {
        settings: createIndexedDbStorage({
          schemas: { count: z.number() },
          defaultValues: { count: 0 },
        }),
      },
    })
    expect(db.stores.settings.get()).toEqual({ count: 0 })
    await db.ready
    expect(read).toHaveBeenCalledOnce()

    read.mockRestore()
  })

  it('hydrate() re-reads from IndexedDB on demand', async () => {
    const a = createStorage(
      { schemas: { count: z.number() }, defaultValues: { count: 0 } },
      'lazy'
    )
    const b = createStorage(
      { schemas: { count: z.number() }, defaultValues: { count: 0 } },
      'lazy'
    )
    await hydrated(b)
    await a.set({ count: 3 })
    expect(b.get()).toEqual({ count: 0 })
    await expect(b.hydrate()).resolves.toEqual({ count: 3 })
    expect(b.get()).toEqual({ count: 3 })
  })

  it('exposes defaultValues as the server snapshot', async () => {
    const storage = createStorage(
      {
        schemas: { count: z.number() },
        defaultValues: { count: 4 },
      },
      'lazy'
    )
    await storage.set({ count: 9 })
    expect(storage.getServer()).toEqual({ count: 4 })
  })
})
