import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createSessionStorage } from './session-storage'
import { sessionStorageValue } from './session-storage-value'

const TEST_KEY = 'utla-session-storage-value-test-key'

describe('sessionStorageValue', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('returns defaultValue when key is not in sessionStorage', () => {
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      expect(storage.get()).toBe(0)
    })

    it('returns defaultValue as-is when it is stringified JSON (no parsing of default)', () => {
      const stringifiedJson = '{"a":1,"b":"two"}'
      const storage = sessionStorageValue({ schema: z.string(), key: TEST_KEY, defaultValue: stringifiedJson })
      expect(storage.get()).toBe(stringifiedJson)
    })

    it('returns parsed JSON when key exists with valid JSON', () => {
      window.sessionStorage.setItem(TEST_KEY, JSON.stringify(42))
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      expect(storage.get()).toBe(42)
    })

    it('returns defaultValue when stored value is invalid JSON and defaultValue is not string', () => {
      window.sessionStorage.setItem(TEST_KEY, 'not-valid-json{{{')
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      expect(storage.get()).toBe(0)
    })

    it('returns raw item when stored value is invalid JSON and defaultValue is string', () => {
      window.sessionStorage.setItem(TEST_KEY, 'raw-string')
      const storage = sessionStorageValue({ schema: z.string(), key: TEST_KEY, defaultValue: 'default' })
      expect(storage.get()).toBe('raw-string')
    })

    it('returns defaultValue when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const storage = sessionStorageValue({ schema: z.string(), key: TEST_KEY, defaultValue: 'ssr-default' })
        expect(storage.get()).toBe('ssr-default')
      }
      finally {
        vi.stubGlobal('window', originalWindow)
      }
    })
  })

  describe('set', () => {
    it('stores stringified value in sessionStorage', () => {
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      storage.set(42)
      expect(window.sessionStorage.getItem(TEST_KEY)).toBe('42')
    })

    it('dispatches storage event', () => {
      const listener = vi.fn()
      window.addEventListener('storage', listener)

      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      storage.set(1)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(expect.any(Event))

      window.removeEventListener('storage', listener)
    })

    it('does nothing when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
        expect(() => storage.set(42)).not.toThrow()
      }
      finally {
        vi.stubGlobal('window', originalWindow)
      }
    })

    it('calls callback with updated value when set is a function', () => {
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      storage.set(v => v + 1)
      expect(storage.get()).toBe(1)
    })
  })

  describe('remove', () => {
    it('removes key from sessionStorage', () => {
      window.sessionStorage.setItem(TEST_KEY, '1')
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      storage.remove()
      expect(window.sessionStorage.getItem(TEST_KEY)).toBeNull()
    })

    it('should\'nt remove other keys from sessionStorage', () => {
      window.sessionStorage.setItem('other-key', '1')
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      storage.remove()
      expect(window.sessionStorage.getItem('other-key')).toBe('1')
    })
  })

  describe('subscribe', () => {
    it('calls callback with current value and event when storage event is dispatched', () => {
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      const callback = vi.fn()

      storage.subscribe(callback)

      storage.set(10)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(10)
    })

    it('stops calling callback after unsubscribe', () => {
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      const callback = vi.fn()

      const unsubscribe = storage.subscribe(callback)
      storage.set(1)
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      storage.set(2)
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('integration', () => {
    it('get reflects set and remove', () => {
      const storage = sessionStorageValue({ schema: z.string(), key: TEST_KEY, defaultValue: 'default' })

      expect(storage.get()).toBe('default')

      storage.set('first')
      expect(storage.get()).toBe('first')

      storage.set('second')
      expect(storage.get()).toBe('second')

      storage.remove()
      expect(storage.get()).toBe('default')
    })

    it('get reflects value set directly in sessionStorage', () => {
      const storage = sessionStorageValue({
        schema: z.union([z.number(), z.object({ x: z.number() })]),
        key: TEST_KEY,
        defaultValue: 0,
      })

      expect(storage.get()).toBe(0)

      window.sessionStorage.setItem(TEST_KEY, JSON.stringify(99))
      expect(storage.get()).toBe(99)

      window.sessionStorage.setItem(TEST_KEY, JSON.stringify({ x: 1 }))
      expect(storage.get()).toEqual({ x: 1 })
    })
  })

  describe('with storage', () => {
    it('returns default value from storage when key is not set', () => {
      const storage = createSessionStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      const countValue = sessionStorageValue({ storage, key: 'count' })
      const nameValue = sessionStorageValue({ storage, key: 'name' })

      expect(countValue.get()).toBe(0)
      expect(nameValue.get()).toBe('')
    })

    it('returns value from storage when key is set', () => {
      const storage = createSessionStorage({
        schemas: { count: z.coerce.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })

      const countValue = sessionStorageValue({ storage, key: 'count' })
      const nameValue = sessionStorageValue({ storage, key: 'name' })

      storage.set({ count: 42, name: 'alice' })

      expect(countValue.get()).toBe(42)
      expect(nameValue.get()).toBe('alice')
    })

    it('set updates storage and is reflected by storage.get()', () => {
      const storage = createSessionStorage({
        schemas: { count: z.coerce.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      const countValue = sessionStorageValue({ storage, key: 'count' })

      countValue.set(10)
      expect(storage.get()).toEqual({ count: 10, name: '' })
      expect(countValue.get()).toBe(10)
    })

    it('set with function receives current value and updates storage', () => {
      const storage = createSessionStorage({
        schemas: { count: z.coerce.number() },
        defaultValues: { count: 0 },
      })
      const countValue = sessionStorageValue({ storage, key: 'count' })
      countValue.set(5)
      countValue.set(v => v + 1)

      expect(countValue.get()).toBe(6)
      expect(storage.get().count).toBe(6)
    })

    it('remove clears only the value key and reverts to default', () => {
      const storage = createSessionStorage({
        schemas: { count: z.coerce.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      storage.set({ count: 99, name: 'keep' })
      const countValue = sessionStorageValue({ storage, key: 'count' })

      countValue.remove()
      expect(window.sessionStorage.getItem('count')).toBeNull()
      expect(countValue.get()).toBe(0)
      expect(storage.get()).toEqual({ count: 0, name: 'keep' })
    })

    it('subscribe is called when value is set', () => {
      const storage = createSessionStorage({
        schemas: { count: z.coerce.number() },
        defaultValues: { count: 0 },
      })
      const countValue = sessionStorageValue({ storage, key: 'count' })
      const callback = vi.fn()

      countValue.subscribe(callback)
      countValue.set(7)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(7)
    })

    it('multiple value instances for same storage key stay in sync', () => {
      const storage = createSessionStorage({
        schemas: { count: z.coerce.number() },
        defaultValues: { count: 0 },
      })
      const countA = sessionStorageValue({ storage, key: 'count' })
      const countB = sessionStorageValue({ storage, key: 'count' })

      countA.set(3)
      expect(countB.get()).toBe(3)

      countB.set(5)
      expect(countA.get()).toBe(5)
    })
  })
})
