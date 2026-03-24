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
          kind: 'localStorage',
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
        kind: 'localStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
        onValidationError,
      })

      expect(storage.get()).toEqual({ count: 0, name: '' })
      expect(onValidationError).toHaveBeenCalled()
      expect(onValidationError).toHaveBeenCalledWith({
        issues: expect.any(Array),
        key: 'count',
        value: 'invalid-number',
      })
    })

    it('returns default value when onValidationError returns undefined', () => {
      window.localStorage.setItem('count', JSON.stringify('invalid-number'))

      const storage = createWebStorage({
        kind: 'localStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 7, name: '' },
        onValidationError: () => undefined,
      })

      expect(storage.get()).toEqual({ count: 7, name: '' })
    })

    it('returns default value when onValidationError returns a value but stored value is still invalid', () => {
      window.localStorage.setItem('count', JSON.stringify('invalid-number'))

      const storage = createWebStorage({
        kind: 'localStorage',
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
        kind: 'localStorage',
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
      expect(callback).toHaveBeenCalledTimes(1)

      window.localStorage.setItem('count', '99')
      window.dispatchEvent(new Event('storage'))
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('defaultValues', () => {
    it('exposes defaultValues as readonly', () => {
      const defaults = { count: 0, name: '' }
      const storage = createWebStorage({
        kind: 'localStorage',
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: defaults,
      })
      expect(storage.getDefaultValue('count')).toEqual(0)
      expect(storage.getDefaultValue('name')).toEqual('')
    })
  })

  describe('keyTransform', () => {
    it('transforms keys using the keyTransform function', () => {
      const storage = createWebStorage({
        kind: 'localStorage',
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
