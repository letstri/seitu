import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'

import { createWebStorageValue } from './index'

const TEST_KEY = 'seitu-session-storage-value-test-key'

describe('createWebStorageValue', () => {
  beforeEach(() => {
    Object.keys(window.localStorage).forEach((key) =>
      window.localStorage.removeItem(key)
    )
  })

  describe('get', () => {
    it('returns defaultValue when key is not in localStorage', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      expect(value.get()).toBe(0)
    })

    it('returns defaultValue as-is when it is stringified JSON (no parsing of default)', () => {
      const stringifiedJson = '{"a":1,"b":"two"}'
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.string(),
        key: TEST_KEY,
        defaultValue: stringifiedJson,
      })
      expect(value.get()).toBe(stringifiedJson)
    })

    it('returns parsed JSON when key exists with valid JSON', () => {
      window.localStorage.setItem(TEST_KEY, JSON.stringify(42))
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      expect(value.get()).toBe(42)
    })

    it('returns defaultValue when stored value is invalid JSON and defaultValue is not string', () => {
      window.localStorage.setItem(TEST_KEY, 'not-valid-json{{{')
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      expect(value.get()).toBe(0)
    })

    it('returns raw item when stored value is invalid JSON and defaultValue is string', () => {
      window.localStorage.setItem(TEST_KEY, 'raw-string')
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.string(),
        key: TEST_KEY,
        defaultValue: 'default',
      })
      expect(value.get()).toBe('raw-string')
    })

    it('returns defaultValue when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const value = createWebStorageValue({
          type: 'localStorage',
          schema: z.string(),
          key: TEST_KEY,
          defaultValue: 'ssr-default',
        })
        expect(value.get()).toBe('ssr-default')
      } finally {
        vi.stubGlobal('window', originalWindow)
      }
    })

    it('calls onValidationError with parsed value and issues', () => {
      const onValidationError = vi.fn()
      window.localStorage.setItem(TEST_KEY, JSON.stringify('invalid-number'))
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
        onValidationError,
      })

      expect(value.get()).toBe(0)
      expect(onValidationError).toHaveBeenCalledOnce()
    })

    it('returns defaultValue when onValidationError returns undefined', () => {
      window.localStorage.setItem(TEST_KEY, JSON.stringify('invalid-number'))
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 10,
        onValidationError: () => undefined,
      })

      expect(value.get()).toBe(10)
    })

    it('returns defaultValue when onValidationError returns a value but stored value is still invalid', () => {
      window.localStorage.setItem(TEST_KEY, JSON.stringify('invalid-number'))
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
        onValidationError: () => 42,
      })

      expect(value.get()).toBe(42)
    })

    describe('object defaultValue (repair)', () => {
      const schema = z.object({ theme: z.string(), count: z.number() })
      const defaultValue = { theme: 'light', count: 0 }

      it('merges partial stored object with default when validation fails', () => {
        window.localStorage.setItem(TEST_KEY, JSON.stringify({ theme: 'dark' }))
        const value = createWebStorageValue({
          type: 'localStorage',
          schema,
          key: TEST_KEY,
          defaultValue,
        })

        expect(value.get()).toEqual({ theme: 'dark', count: 0 })
      })

      it('returns full default when stored JSON is not an object', () => {
        window.localStorage.setItem(TEST_KEY, JSON.stringify(null))
        const value = createWebStorageValue({
          type: 'localStorage',
          schema,
          key: TEST_KEY,
          defaultValue,
        })

        expect(value.get()).toEqual(defaultValue)
      })

      it('drops extra keys not in default and keeps matching types only', () => {
        window.localStorage.setItem(
          TEST_KEY,
          JSON.stringify({ theme: 'dark', count: 'bad', extra: 99 })
        )
        const value = createWebStorageValue({
          type: 'localStorage',
          schema,
          key: TEST_KEY,
          defaultValue,
        })

        expect(value.get()).toEqual({ theme: 'dark', count: 0 })
      })

      it('repairs after onValidationError returns undefined', () => {
        const onValidationError = vi.fn(() => undefined)
        window.localStorage.setItem(
          TEST_KEY,
          JSON.stringify({ theme: 'sepia' })
        )
        const value = createWebStorageValue({
          type: 'localStorage',
          schema,
          key: TEST_KEY,
          defaultValue,
          onValidationError,
        })

        expect(value.get()).toEqual({ theme: 'sepia', count: 0 })
        expect(onValidationError).toHaveBeenCalledOnce()
        expect(onValidationError).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultValue,
            value: { theme: 'sepia' },
          })
        )
      })
    })
  })

  describe('set', () => {
    it('stores stringified value in localStorage', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      value.set(42)
      expect(window.localStorage.getItem(TEST_KEY)).toBe('42')
    })

    it('dispatches storage event', () => {
      const listener = vi.fn()
      window.addEventListener('storage', listener)

      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      value.set(1)

      expect(listener).toHaveBeenCalledOnce()
      expect(listener).toHaveBeenCalledWith(expect.any(Event))

      window.removeEventListener('storage', listener)
    })

    it('dispatches storage event with JSON-stringified newValue for object values', () => {
      const listener = vi.fn()
      window.addEventListener('storage', listener)

      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.object({ theme: z.string() }),
        key: TEST_KEY,
        defaultValue: { theme: 'light' },
      })
      value.set({ theme: 'dark' })

      expect(listener).toHaveBeenCalledOnce()
      const event: StorageEvent = listener.mock.calls[0][0]
      expect(event.newValue).toBe(JSON.stringify({ theme: 'dark' }))

      window.removeEventListener('storage', listener)
    })

    it('does nothing when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const value = createWebStorageValue({
          type: 'localStorage',
          schema: z.number(),
          key: TEST_KEY,
          defaultValue: 0,
        })
        expect(() => value.set(42)).not.toThrow()
      } finally {
        vi.stubGlobal('window', originalWindow)
      }
    })

    it('calls callback with updated value when set is a function', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      value.set((v) => v + 1)
      expect(value.get()).toBe(1)
    })
  })

  describe('remove', () => {
    it('removes the item from localStorage', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      value.set(42)
      expect(window.localStorage.getItem(TEST_KEY)).toBe('42')

      value.clear()
      expect(window.localStorage.getItem(TEST_KEY)).toBeNull()
    })

    it('get returns defaultValue after remove', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.string(),
        key: TEST_KEY,
        defaultValue: 'fallback',
      })
      value.set('hello')
      expect(value.get()).toBe('hello')

      value.clear()
      expect(value.get()).toBe('fallback')
    })

    it('does nothing when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const value = createWebStorageValue({
          type: 'localStorage',
          schema: z.number(),
          key: TEST_KEY,
          defaultValue: 0,
        })
        expect(() => value.clear()).not.toThrow()
      } finally {
        vi.stubGlobal('window', originalWindow)
      }
    })
  })

  describe('subscribe', () => {
    it('notifies subscribers with the default value after clear', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      value.set(5)

      const callback = vi.fn()
      value.subscribe(callback)

      value.clear()
      expect(callback).toHaveBeenCalledWith(0)
    })

    it('calls callback with current value and event when storage event is dispatched', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      const callback = vi.fn()

      value.subscribe(callback)

      value.set(10)

      expect(callback).toHaveBeenCalledOnce()
      expect(callback).toHaveBeenCalledWith(10)
    })

    it('stops calling callback after unsubscribe', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
      const callback = vi.fn()

      const unsubscribe = value.subscribe(callback)
      value.set(1)
      expect(callback).toHaveBeenCalledOnce()

      unsubscribe()
      value.set(2)
      expect(callback).toHaveBeenCalledOnce()
    })
  })

  describe('integration', () => {
    it('get reflects set', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.string(),
        key: TEST_KEY,
        defaultValue: 'default',
      })

      expect(value.get()).toBe('default')

      value.set('first')
      expect(value.get()).toBe('first')

      value.set('second')
      expect(value.get()).toBe('second')
    })

    it('preserves ID string on set/get round-trip', () => {
      const snowflakeId = '3748847730293342'
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.string(),
        key: TEST_KEY,
        defaultValue: '',
      })

      value.set(snowflakeId)

      expect(value.get()).toBe(snowflakeId)
    })

    it('get reflects value set directly in localStorage', () => {
      const value = createWebStorageValue({
        type: 'localStorage',
        schema: z.union([z.number(), z.object({ x: z.number() })]),
        key: TEST_KEY,
        defaultValue: 0,
      })

      expect(value.get()).toBe(0)

      window.localStorage.setItem(TEST_KEY, JSON.stringify(99))
      expect(value.get()).toBe(99)

      window.localStorage.setItem(TEST_KEY, JSON.stringify({ x: 1 }))
      expect(value.get()).toEqual({ x: 1 })
    })
  })
})

describe('createWebStorageValue server snapshot', () => {
  it('exposes defaultValue as the server snapshot', () => {
    const value = createWebStorageValue({
      type: 'localStorage',
      schema: z.number(),
      key: TEST_KEY,
      defaultValue: 3,
    })
    value.set(9)
    expect(value.getServer()).toBe(3)
  })

  it('does not notify when set writes the same raw value', () => {
    const value = createWebStorageValue({
      type: 'localStorage',
      schema: z.number(),
      key: TEST_KEY,
      defaultValue: 0,
    })
    value.set(1)
    const callback = vi.fn()
    value.subscribe(callback)

    value.set(1)
    expect(callback).not.toHaveBeenCalled()
    value.set(2)
    expect(callback).toHaveBeenCalledOnce()
  })
})
