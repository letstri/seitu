import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'

import { createCookieValue } from './index'

const KEY = 'seitu-cookie-value-test'

// happy-dom keys cookies by path, and the default path is '' (browsers: '/').
const clearCookies = () => {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim()
    if (name) {
      document.cookie = `${name}=; Path=/; Max-Age=0; Expires=${new Date(0).toUTCString()}`
    }
  }
}

describe('createCookieValue', () => {
  beforeEach(clearCookies)
  afterEach(() => vi.restoreAllMocks())

  describe('get', () => {
    it('returns defaultValue when the cookie is missing', () => {
      const value = createCookieValue({
        key: KEY,
        schema: z.number(),
        defaultValue: 0,
      })
      expect(value.get()).toBe(0)
    })

    it('reads an existing cookie', () => {
      document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify({ a: 1 }))}; Path=/`
      const value = createCookieValue({
        key: KEY,
        schema: z.object({ a: z.number() }),
        defaultValue: { a: 0 },
      })
      expect(value.get()).toEqual({ a: 1 })
    })

    it('falls back to defaultValue on invalid JSON', () => {
      document.cookie = `${KEY}=not-json{{{; Path=/`
      const value = createCookieValue({
        key: KEY,
        schema: z.number(),
        defaultValue: 0,
      })
      expect(value.get()).toBe(0)
    })

    it('falls back to defaultValue on schema failure and calls onValidationError', () => {
      const onValidationError = vi.fn()
      document.cookie = `${KEY}=${JSON.stringify('nope')}; Path=/`
      const value = createCookieValue({
        key: KEY,
        schema: z.number(),
        defaultValue: 7,
        onValidationError,
      })
      expect(value.get()).toBe(7)
      expect(onValidationError).toHaveBeenCalledOnce()
    })

    it('repairs partial objects with the default', () => {
      document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify({ theme: 'dark' }))}; Path=/`
      const value = createCookieValue({
        key: KEY,
        schema: z.object({ theme: z.string(), count: z.number() }),
        defaultValue: { theme: 'light', count: 0 },
      })
      expect(value.get()).toEqual({ theme: 'dark', count: 0 })
    })

    it('reads a raw string cookie written by other code', () => {
      document.cookie = `${KEY}=plain; Path=/`
      const value = createCookieValue({
        key: KEY,
        schema: z.string(),
        defaultValue: '',
      })
      expect(value.get()).toBe('plain')
    })
  })

  describe('set / clear', () => {
    it('round-trips through set, including an updater', () => {
      const value = createCookieValue({
        key: KEY,
        schema: z.number(),
        defaultValue: 0,
      })
      value.set(1)
      expect(value.get()).toBe(1)
      value.set((v) => v + 1)
      expect(value.get()).toBe(2)
      expect(document.cookie).toContain(`${KEY}=2`)
    })

    it('encodes the value', () => {
      const value = createCookieValue({
        key: KEY,
        schema: z.object({ a: z.string() }),
        defaultValue: { a: '' },
      })
      value.set({ a: 'x; y' })
      expect(document.cookie).toContain(
        `${KEY}=${encodeURIComponent(JSON.stringify({ a: 'x; y' }))}`
      )
      expect(value.get()).toEqual({ a: 'x; y' })
    })

    it('clear removes the cookie', () => {
      const value = createCookieValue({
        key: KEY,
        schema: z.number(),
        defaultValue: 0,
      })
      value.set(5)
      value.clear()
      expect(document.cookie).not.toContain(KEY)
      expect(value.get()).toBe(0)
    })

    it('skips writes over 4096 bytes', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const value = createCookieValue({
        key: KEY,
        schema: z.string(),
        defaultValue: '',
      })
      value.set('x'.repeat(5000))
      expect(warn).toHaveBeenCalledOnce()
      expect(value.get()).toBe('')
    })

    it('does nothing on the server', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)
      try {
        const value = createCookieValue({
          key: KEY,
          schema: z.number(),
          defaultValue: 0,
        })
        expect(() => value.set(1)).not.toThrow()
        expect(() => value.clear()).not.toThrow()
      } finally {
        vi.stubGlobal('window', originalWindow)
      }
    })
  })

  describe('server', () => {
    it('reads getServerCookies for get and getServer', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)
      try {
        const value = createCookieValue({
          key: KEY,
          schema: z.string(),
          defaultValue: 'default',
          getServerCookies: () =>
            `other=1; ${KEY}=${encodeURIComponent('"fr"')}`,
        })
        expect(value.get()).toBe('fr')
        expect(value.getServer()).toBe('fr')
      } finally {
        vi.stubGlobal('window', originalWindow)
      }
    })

    it('returns defaultValue without a reader or cookie', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)
      try {
        expect(
          createCookieValue({
            key: KEY,
            schema: z.string(),
            defaultValue: 'default',
          }).get()
        ).toBe('default')
        expect(
          createCookieValue({
            key: KEY,
            schema: z.string(),
            defaultValue: 'default',
            getServerCookies: () => 'other=1',
          }).get()
        ).toBe('default')
      } finally {
        vi.stubGlobal('window', originalWindow)
      }
    })
  })

  describe('subscribe', () => {
    it('notifies on set and clear, not on same value', () => {
      const value = createCookieValue({
        key: KEY,
        schema: z.number(),
        defaultValue: 0,
      })
      const callback = vi.fn()
      const unsubscribe = value.subscribe(callback)

      value.set(1)
      expect(callback).toHaveBeenCalledWith(1)
      value.set(1)
      expect(callback).toHaveBeenCalledOnce()
      value.clear()
      expect(callback).toHaveBeenLastCalledWith(0)

      unsubscribe()
      value.set(2)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('notifies on a cookieStore change for the same name', () => {
      const listeners = new Set<(event: unknown) => void>()
      vi.stubGlobal('cookieStore', {
        addEventListener: (_: string, cb: (event: unknown) => void) =>
          listeners.add(cb),
        removeEventListener: (_: string, cb: (event: unknown) => void) =>
          listeners.delete(cb),
      })
      try {
        const value = createCookieValue({
          key: KEY,
          schema: z.number(),
          defaultValue: 0,
        })
        const callback = vi.fn()
        const unsubscribe = value.subscribe(callback)

        document.cookie = `${KEY}=3; Path=/`
        for (const cb of listeners) {
          cb({ changed: [{ name: 'other' }], deleted: [] })
        }
        expect(callback).not.toHaveBeenCalled()
        for (const cb of listeners) {
          cb({ changed: [{ name: KEY }], deleted: [] })
        }
        expect(callback).toHaveBeenCalledWith(3)

        unsubscribe()
        expect(listeners.size).toBe(0)
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('notifies through the BroadcastChannel fallback', async () => {
      vi.stubGlobal('cookieStore', undefined)
      const value = createCookieValue({
        key: KEY,
        schema: z.number(),
        defaultValue: 0,
      })
      const callback = vi.fn()
      const unsubscribe = value.subscribe(callback)

      document.cookie = `${KEY}=4; Path=/`
      const other = new BroadcastChannel('seitu:cookie')
      other.postMessage({ key: KEY })
      other.close()

      await vi.waitFor(() => expect(callback).toHaveBeenCalledWith(4))
      unsubscribe()
      vi.unstubAllGlobals()
    })

    it('does not notify twice when the change event follows set', async () => {
      const value = createCookieValue({
        key: KEY,
        schema: z.number(),
        defaultValue: 0,
      })
      const callback = vi.fn()
      const unsubscribe = value.subscribe(callback)

      value.set(8)
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(callback).toHaveBeenCalledOnce()
      unsubscribe()
    })
  })
})
