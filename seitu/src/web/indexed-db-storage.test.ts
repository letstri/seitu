import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createIndexedDbStorage } from './indexed-db-storage'

describe('createIndexedDbStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory())
  })

  describe('get', () => {
    it('returns defaultValues synchronously before hydration', () => {
      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: 'default' },
      })
      expect(storage.get()).toEqual({ count: 0, name: 'default' })
    })

    it('returns defaultValues when indexedDB is undefined (SSR)', async () => {
      vi.stubGlobal('indexedDB', undefined)

      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: 'ssr-default' },
      })
      await expect(storage.ready).resolves.toEqual({ count: 0, name: 'ssr-default' })
      expect(storage.get()).toEqual({ count: 0, name: 'ssr-default' })
    })

    it('hydrates persisted values from IndexedDB', async () => {
      const a = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      await a.set({ count: 5, name: 'bob' })

      const b = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      await b.ready
      expect(b.get()).toEqual({ count: 5, name: 'bob' })
    })

    it('calls onValidationError with key, parsed value, and issues', async () => {
      const seed = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      // @ts-expect-error test invalid value
      await seed.set({ count: 'invalid-number' })

      const onValidationError = vi.fn()
      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
        onValidationError,
      })

      await expect(storage.ready).resolves.toEqual({ count: 0, name: '' })
      expect(onValidationError).toHaveBeenCalled()
    })

    it('returns repaired value when onValidationError returns a value', async () => {
      const seed = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      // @ts-expect-error test invalid value
      await seed.set({ count: 'invalid-number' })

      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
        onValidationError: ({ key }) => (key === 'count' ? 55 : undefined),
      })

      await expect(storage.ready).resolves.toEqual({ count: 55 })
    })
  })

  describe('set', () => {
    it('updates the cache synchronously and persists asynchronously', async () => {
      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      const callback = vi.fn()
      storage.subscribe(callback)

      const promise = storage.set({ count: 5 })
      expect(storage.get()).toEqual({ count: 5, name: '' })
      expect(callback).toHaveBeenCalledTimes(1)
      await promise
    })

    it('supports updater functions', async () => {
      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number() },
        defaultValues: { count: 1 },
      })
      await storage.set(prev => ({ count: prev.count + 1 }))
      expect(storage.get()).toEqual({ count: 2 })
    })
  })

  describe('clear', () => {
    it('resets to defaultValues and removes managed keys', async () => {
      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: 'default' },
      })
      await storage.set({ count: 42, name: 'alice' })
      expect(storage.get()).toEqual({ count: 42, name: 'alice' })

      await storage.clear()
      expect(storage.get()).toEqual({ count: 0, name: 'default' })

      const next = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: 'default' },
      })
      await next.ready
      expect(next.get()).toEqual({ count: 0, name: 'default' })
    })

    it('notifies subscribers after clear', async () => {
      const storage = createIndexedDbStorage({
        databaseName: 'test',
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
      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
        keyTransform: key => `prefix-${String(key)}`,
      })
      await storage.set({ count: 5 })

      const same = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
        keyTransform: key => `prefix-${String(key)}`,
      })
      await same.ready
      expect(same.get()).toEqual({ count: 5 })

      const untransformed = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      await untransformed.ready
      expect(untransformed.get()).toEqual({ count: 0 })
    })
  })

  describe('~', () => {
    it('exposes defaultValues, databaseName, and storeName', () => {
      const storage = createIndexedDbStorage({
        databaseName: 'test',
        storeName: 'store',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      expect(storage['~'].getDefaultValue('count')).toBe(0)
      expect(storage['~'].getDefaultValue('name')).toBe('')
      expect(storage['~'].databaseName).toBe('test')
      expect(storage['~'].storeName).toBe('store')
    })
  })

  describe('write during hydration', () => {
    it('keeps locally-written keys without losing untouched persisted keys', async () => {
      const seed = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      await seed.set({ count: 5, name: 'bob' })

      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      // Write before the initial hydrate resolves.
      const setPromise = storage.set({ count: 10 })

      await Promise.all([storage.ready, setPromise])

      // `count` keeps the local write, `name` keeps the untouched persisted value.
      expect(storage.get()).toEqual({ count: 10, name: 'bob' })
    })
  })

  describe('shared database', () => {
    it('creates sibling object stores in the same database without blocking', async () => {
      const a = createIndexedDbStorage({
        databaseName: 'shared',
        storeName: 'a',
        schemas: { value: z.string() },
        defaultValues: { value: '' },
      })
      await a.set({ value: 'from-a' })

      const b = createIndexedDbStorage({
        databaseName: 'shared',
        storeName: 'b',
        schemas: { value: z.string() },
        defaultValues: { value: '' },
      })
      await b.set({ value: 'from-b' })

      const aAgain = createIndexedDbStorage({
        databaseName: 'shared',
        storeName: 'a',
        schemas: { value: z.string() },
        defaultValues: { value: '' },
      })
      const bAgain = createIndexedDbStorage({
        databaseName: 'shared',
        storeName: 'b',
        schemas: { value: z.string() },
        defaultValues: { value: '' },
      })
      await Promise.all([aAgain.ready, bAgain.ready])

      expect(aAgain.get()).toEqual({ value: 'from-a' })
      expect(bAgain.get()).toEqual({ value: 'from-b' })
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

      const storage = createIndexedDbStorage({
        databaseName: 'test',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })

      await expect(storage.ready).resolves.toEqual({ count: 0 })
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})
