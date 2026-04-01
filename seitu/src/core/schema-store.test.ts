import { describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createSchemaStore } from './schema-store'

describe('createSchemaStore', () => {
  describe('get', () => {
    it('returns defaultValue initially', () => {
      const store = createSchemaStore({
        schema: z.object({ count: z.number(), name: z.string() }),
        defaultValue: { count: 0, name: '' },
      })
      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('returns defaultValue initially for primitive schema', () => {
      const store = createSchemaStore({
        schema: z.number(),
        defaultValue: 0,
      })
      expect(store.get()).toBe(0)
    })

    it('returns set value after set', () => {
      const store = createSchemaStore({
        schema: z.object({ count: z.number(), name: z.string() }),
        defaultValue: { count: 0, name: '' },
      })
      store.set({ count: 42, name: 'alice' })
      expect(store.get()).toEqual({ count: 42, name: 'alice' })
    })

    it('returns set value for string schema', () => {
      const store = createSchemaStore({
        schema: z.string(),
        defaultValue: '',
      })
      store.set('hello')
      expect(store.get()).toBe('hello')
    })

    it('returns set value for number schema', () => {
      const store = createSchemaStore({
        schema: z.number(),
        defaultValue: 0,
      })
      store.set(42)
      expect(store.get()).toBe(42)
    })

    it('returns set value for array schema', () => {
      const store = createSchemaStore({
        schema: z.array(z.number()),
        defaultValue: [],
      })
      store.set([1, 2, 3])
      expect(store.get()).toEqual([1, 2, 3])
    })

    it('works with z.record schema', () => {
      const store = createSchemaStore({
        schema: z.record(z.string(), z.number()),
        defaultValue: {},
      })
      store.set({ x: 10, y: 20 })
      expect(store.get()).toEqual({ x: 10, y: 20 })
    })

    it('returns defaultValue when stored value fails validation', () => {
      const store = createSchemaStore({
        schema: z.number(),
        defaultValue: 0,
      })
      // @ts-expect-error - test invalid value
      store.set('not-a-number')
      expect(store.get()).toBe(0)
    })

    it('returns defaultValue when object validation fails', () => {
      const store = createSchemaStore({
        schema: z.object({ count: z.number(), name: z.string() }),
        defaultValue: { count: 0, name: '' },
      })
      // @ts-expect-error - test invalid value
      store.set({ count: 'invalid', name: 'test' })
      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('returns defaultValue with z.record when stored value fails validation', () => {
      const store = createSchemaStore({
        schema: z.record(z.string(), z.number()),
        defaultValue: { x: 0 },
      })
      // @ts-expect-error - test invalid value
      store.set({ x: 'not-a-number' })
      expect(store.get()).toEqual({ x: 0 })
    })

    it('applies schema transforms on get', () => {
      const store = createSchemaStore({
        schema: z.string().transform(s => s.trim()),
        defaultValue: '',
      })
      store.set('  hello  ')
      expect(store.get()).toBe('hello')
    })

    it('applies object schema transforms on get', () => {
      const store = createSchemaStore({
        schema: z.object({ label: z.string().transform(s => s.trim()) }),
        defaultValue: { label: '' },
      })
      store.set({ label: '  hello  ' })
      expect(store.get()).toEqual({ label: 'hello' })
    })
  })

  describe('set', () => {
    it('stores and retrieves values', () => {
      const store = createSchemaStore({
        schema: z.object({ count: z.number(), name: z.string() }),
        defaultValue: { count: 0, name: '' },
      })
      store.set({ count: 5, name: 'bob' })
      expect(store.get()).toEqual({ count: 5, name: 'bob' })
    })

    it('supports updater function', () => {
      const store = createSchemaStore({
        schema: z.number(),
        defaultValue: 0,
      })
      store.set(prev => prev + 10)
      expect(store.get()).toBe(10)
      store.set(prev => prev + 5)
      expect(store.get()).toBe(15)
    })

    it('supports updater function for objects', () => {
      const store = createSchemaStore({
        schema: z.object({ count: z.number(), name: z.string() }),
        defaultValue: { count: 0, name: '' },
      })
      store.set(prev => ({ ...prev, count: 3 }))
      expect(store.get()).toEqual({ count: 3, name: '' })
    })

    it('stores string values as-is', () => {
      const store = createSchemaStore({
        schema: z.string(),
        defaultValue: '',
      })
      store.set('plain')
      expect(store.get()).toBe('plain')
    })
  })

  describe('subscribe', () => {
    it('calls callback with current value when set is called', () => {
      const store = createSchemaStore({
        schema: z.number(),
        defaultValue: 0,
      })
      const callback = vi.fn()
      store.subscribe(callback)

      store.set(10)

      expect(callback).toHaveBeenCalled()
      expect(callback).toHaveBeenLastCalledWith(10)
      expect(store.get()).toBe(10)
    })

    it('stops calling callback after unsubscribe', () => {
      const store = createSchemaStore({
        schema: z.number(),
        defaultValue: 0,
      })
      const callback = vi.fn()
      const unsubscribe = store.subscribe(callback)

      store.set(1)
      const callsAfterSet = callback.mock.calls.length

      unsubscribe()
      store.set(2)
      expect(callback).toHaveBeenCalledTimes(callsAfterSet)
    })

    it('calls callback with latest value after each set', () => {
      const store = createSchemaStore({
        schema: z.string(),
        defaultValue: '',
      })
      const callback = vi.fn()
      store.subscribe(callback)

      store.set('first')
      expect(callback).toHaveBeenLastCalledWith('first')

      store.set('second')
      expect(callback).toHaveBeenLastCalledWith('second')
    })
  })

  describe('onValidationError', () => {
    it('calls onValidationError with issues, value, and defaultValue', () => {
      const onValidationError = vi.fn()

      const store = createSchemaStore({
        schema: z.number(),
        defaultValue: 0,
        onValidationError,
      })

      // @ts-expect-error - test invalid value
      store.set('invalid')

      expect(store.get()).toBe(0)
      expect(onValidationError).toHaveBeenCalled()
      expect(onValidationError).toHaveBeenCalledWith(expect.objectContaining({
        defaultValue: 0,
        issues: expect.any(Array),
        value: 'invalid',
      }))
    })

    it('calls onValidationError for object schema', () => {
      const onValidationError = vi.fn()

      const store = createSchemaStore({
        schema: z.object({ count: z.number(), name: z.string() }),
        defaultValue: { count: 0, name: '' },
        onValidationError,
      })

      // @ts-expect-error - test invalid value
      store.set({ count: 'invalid', name: 'test' })

      expect(store.get()).toEqual({ count: 0, name: '' })
      expect(onValidationError).toHaveBeenCalled()
      expect(onValidationError).toHaveBeenCalledWith(expect.objectContaining({
        defaultValue: { count: 0, name: '' },
        issues: expect.any(Array),
      }))
    })

    it('uses corrected value when onValidationError returns a valid value', () => {
      const store = createSchemaStore({
        schema: z.number(),
        defaultValue: 0,
        onValidationError: () => 99,
      })

      // @ts-expect-error - test invalid value
      store.set('invalid')

      expect(store.get()).toBe(99)
    })

    it('returns default value when onValidationError returns an invalid value', () => {
      const store = createSchemaStore({
        schema: z.number(),
        defaultValue: 0,
        // @ts-expect-error - test invalid value
        onValidationError: () => 'still-invalid',
      })

      expect(store.get()).toBe(0)
    })
  })
})
