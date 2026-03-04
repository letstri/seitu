import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createSessionStorage } from './session-storage'

describe('createSessionStorage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  describe('get', () => {
    it('returns defaultValues when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const storage = createSessionStorage({
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
  })

  describe('set', () => {
    it('stores values in sessionStorage and notifies subscribers on set and on storage event', () => {
      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })
      const callback = vi.fn()
      storage.subscribe(callback)

      storage.set({ count: 5, name: 'bob' })
      expect(window.sessionStorage.getItem('count')).toBe('5')
      expect(window.sessionStorage.getItem('name')).toBe('bob')
      expect(callback).toHaveBeenCalledTimes(1)

      window.sessionStorage.setItem('count', '99')
      window.dispatchEvent(new Event('storage'))
      expect(callback).toHaveBeenCalledTimes(2)
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
      expect(storage.getDefaultValue('count')).toEqual(0)
      expect(storage.getDefaultValue('name')).toEqual('')
    })
  })

  describe('integration', () => {
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
