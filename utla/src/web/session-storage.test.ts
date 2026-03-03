import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createSessionStorage } from './session-storage'

describe('createSessionStorage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('returns defaultValues when keys are not in sessionStorage', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.coerce.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      expect(storage.get()).toEqual({ count: 0, name: '' })
    })

    it('returns parsed values when keys exist with valid stored data', () => {
      window.sessionStorage.setItem('count', JSON.stringify(42))
      window.sessionStorage.setItem('name', 'alice')

      const storage = createSessionStorage({
        schemas: {
          count: z.coerce.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      expect(storage.get()).toEqual({ count: 42, name: 'alice' })
    })

    it('merges stored values with defaultValues for partial keys', () => {
      window.sessionStorage.setItem('count', JSON.stringify(10))

      const storage = createSessionStorage({
        schemas: {
          count: z.coerce.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: 'default' },
      })
      expect(storage.get()).toEqual({ count: 10, name: 'default' })
    })

    it('returns defaultValues when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const storage = createSessionStorage({
          schemas: {
            count: z.coerce.number(),
            name: z.string(),
          },
          defaultValues: { count: 0, name: 'ssr-default' },
        })
        expect(storage.get()).toEqual({ count: 0, name: 'ssr-default' })
      }
      finally {
        vi.stubGlobal('window', originalWindow)
      }
    })

    it('returns defaultValues when stored value fails validation', () => {
      window.sessionStorage.setItem('count', JSON.stringify('invalid'))

      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      expect(storage.get()).toEqual({ count: 0, name: '' })
    })

    it('return default value for invalid keys', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      window.sessionStorage.setItem('count', 'invalid')
      window.sessionStorage.setItem('name', 'Test')
      expect(storage.get()).toEqual({ count: 0, name: 'Test' })
    })
  })

  describe('set', () => {
    it('stores values in sessionStorage', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.coerce.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      storage.set({ count: 5, name: 'bob' })
      expect(window.sessionStorage.getItem('count')).toBe('5')
      expect(window.sessionStorage.getItem('name')).toBe('bob')
    })

    it('can set partial updates (only some keys)', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      storage.set({ count: 3 })
      expect(window.sessionStorage.getItem('count')).toBe('3')
      expect(storage.get().count).toBe(3)
      expect(storage.get().name).toBe('')
    })

    it('notifies subscribers when set receives a function', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      const callback = vi.fn()
      storage.subscribe(callback)
      storage.set(prev => ({ ...prev, count: prev.count + 1 }))
      expect(callback).toHaveBeenCalled()
    })

    it('stores string values as-is without extra JSON encoding', () => {
      const storage = createSessionStorage({
        schemas: {
          name: z.string(),
        },
        defaultValues: { name: '' },
      })
      storage.set({ name: 'plain' })
      expect(window.sessionStorage.getItem('name')).toBe('plain')
    })
  })

  describe('clear', () => {
    it('clears sessionStorage and notifies with defaultValues', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      storage.set({ count: 99, name: 'x' })
      expect(storage.get()).toEqual({ count: 99, name: 'x' })

      storage.clear()
      expect(window.sessionStorage.length).toBe(0)
      expect(storage.get()).toEqual({ count: 0, name: '' })
    })
  })

  describe('subscribe', () => {
    it('calls callback with current value when set is called', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      const callback = vi.fn()
      storage.subscribe(callback)

      storage.set({ count: 10, name: 'sub' })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ count: 10, name: 'sub' })
    })

    it('stops calling callback after unsubscribe', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      const callback = vi.fn()
      const unsubscribe = storage.subscribe(callback)

      storage.set({ count: 1, name: '' })
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      storage.set({ count: 2, name: '' })
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('calls callback with new value when clear is called', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      const callback = vi.fn()
      storage.subscribe(callback)
      storage.set({ count: 5, name: 'x' })
      expect(callback).toHaveBeenCalledWith({ count: 5, name: 'x' })

      storage.clear()
      expect(callback).toHaveBeenCalledWith({ count: 0, name: '' })
    })
  })

  describe('defaultValues', () => {
    it('exposes defaultValues as readonly', () => {
      const defaults = { count: 0, name: '' }
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: defaults,
      })
      expect(storage.defaultValues).toEqual(defaults)
      expect(storage.defaultValues).not.toBe(defaults)
    })
  })

  describe('integration', () => {
    it('get reflects set and clear', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.coerce.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })

      expect(storage.get()).toEqual({ count: 0, name: '' })

      storage.set({ count: 1, name: 'a' })
      expect(storage.get()).toEqual({ count: 1, name: 'a' })

      storage.set({ count: 2, name: 'b' })
      expect(storage.get()).toEqual({ count: 2, name: 'b' })

      storage.clear()
      expect(storage.get()).toEqual({ count: 0, name: '' })
    })

    it('get reflects values set directly in sessionStorage', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })

      expect(storage.get()).toEqual({ count: 0, name: '' })

      window.sessionStorage.setItem('count', '99')
      window.sessionStorage.setItem('name', 'direct')
      expect(storage.get()).toEqual({ count: 99, name: 'direct' })
    })
  })
})
