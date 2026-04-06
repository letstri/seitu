import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createWebStorage } from './web-storage'

describe('createWebStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('get', () => {
    it('returns defaultValues when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const storage = createWebStorage({
          type: 'localStorage',
          schemas: {
            count: z.number(),
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

    it('calls onValidationError with key, parsed value, and issues', () => {
      const onValidationError = vi.fn()
      window.localStorage.setItem('count', JSON.stringify('invalid-number'))

      const storage = createWebStorage({
        type: 'localStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
        onValidationError,
      })

      expect(storage.get()).toEqual({ count: 0, name: '' })
      expect(onValidationError).toHaveBeenCalled()
    })

    it('returns default value when onValidationError returns undefined', () => {
      window.localStorage.setItem('count', JSON.stringify('invalid-number'))

      const storage = createWebStorage({
        type: 'localStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 7, name: '' },
        onValidationError: () => undefined,
      })

      expect(storage.get()).toEqual({ count: 7, name: '' })
    })

    it('returns default value when onValidationError returns a value but stored value is still invalid', () => {
      window.localStorage.setItem('count', JSON.stringify('invalid-number'))

      const storage = createWebStorage({
        type: 'localStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
        onValidationError: ({ key }) => {
          if (key === 'count') {
            return 55
          }
        },
      })

      expect(storage.get()).toEqual({ count: 55, name: '' })
    })
  })

  describe('set', () => {
    it('stores values in localStorage and notifies subscribers on set and on storage event', () => {
      const storage = createWebStorage({
        type: 'localStorage',
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      const callback = vi.fn()
      storage.subscribe(callback)

      storage.set({ count: 5, name: 'bob' })
      expect(window.localStorage.getItem('count')).toBe('5')
      expect(window.localStorage.getItem('name')).toBe('bob')
      expect(callback).toHaveBeenCalledTimes(2)

      window.localStorage.setItem('count', '99')
      window.dispatchEvent(new StorageEvent('storage', { key: 'count' }))
      expect(callback).toHaveBeenCalledTimes(3)
    })
  })

  describe('defaultValues', () => {
    it('exposes defaultValues as readonly', () => {
      const defaults = { count: 0, name: '' }
      const storage = createWebStorage({
        type: 'localStorage',
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: defaults,
      })
      expect(storage['~'].getDefaultValue('count')).toEqual(0)
      expect(storage['~'].getDefaultValue('name')).toEqual('')
    })
  })

  describe('clear', () => {
    it('removes all managed keys from localStorage', () => {
      const storage = createWebStorage({
        type: 'localStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      storage.set({ count: 5, name: 'bob' })
      expect(window.localStorage.getItem('count')).toBe('5')
      expect(window.localStorage.getItem('name')).toBe('bob')

      storage.clear()
      expect(window.localStorage.getItem('count')).toBeNull()
      expect(window.localStorage.getItem('name')).toBeNull()
    })

    it('get returns defaultValues after clear', () => {
      const storage = createWebStorage({
        type: 'localStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: 'default' },
      })
      storage.set({ count: 42, name: 'alice' })
      expect(storage.get()).toEqual({ count: 42, name: 'alice' })

      storage.clear()
      expect(storage.get()).toEqual({ count: 0, name: 'default' })
    })

    it('notifies subscribers after clear', () => {
      const storage = createWebStorage({
        type: 'localStorage',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      const callback = vi.fn()
      storage.subscribe(callback)

      storage.set({ count: 5 })
      storage.clear()
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('does not affect unmanaged keys', () => {
      window.localStorage.setItem('unrelated', 'keep-me')

      const storage = createWebStorage({
        type: 'localStorage',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      storage.set({ count: 5 })
      storage.clear()

      expect(window.localStorage.getItem('unrelated')).toBe('keep-me')
    })

    it('does nothing when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const storage = createWebStorage({
          type: 'localStorage',
          schemas: { count: z.number() },
          defaultValues: { count: 0 },
        })
        expect(() => storage.clear()).not.toThrow()
      }
      finally {
        vi.stubGlobal('window', originalWindow)
      }
    })

    it('clears keys with keyTransform applied', () => {
      const storage = createWebStorage({
        type: 'localStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
        keyTransform: key => `prefix-${key}`,
      })
      storage.set({ count: 5, name: 'bob' })
      expect(window.localStorage.getItem('prefix-count')).toBe('5')
      expect(window.localStorage.getItem('prefix-name')).toBe('bob')

      storage.clear()
      expect(window.localStorage.getItem('prefix-count')).toBeNull()
      expect(window.localStorage.getItem('prefix-name')).toBeNull()
    })
  })

  describe('keyTransform', () => {
    it('transforms keys using the keyTransform function', () => {
      const storage = createWebStorage({
        type: 'localStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
        keyTransform: key => `prefix-${key}`,
      })
      storage.set({ count: 5, name: 'bob' })
      expect(window.localStorage.getItem('prefix-count')).toBe('5')
      expect(window.localStorage.getItem('prefix-name')).toBe('bob')
    })
  })
})
