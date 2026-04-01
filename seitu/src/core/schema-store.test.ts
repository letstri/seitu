import { describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createSchemaStore } from './schema-store'

describe('createSchemaStore', () => {
  describe('get', () => {
    it('returns defaultValue when provider is empty', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
      })
      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('returns parsed values when keys exist with valid stored data', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
      })
      store.set({ count: 42, name: 'alice' })
      expect(store.get()).toEqual({ count: 42, name: 'alice' })
    })

    it('works with z.record schema', () => {
      const store = createSchemaStore({
        schema: z.record(z.string(), z.number()),
        defaultValue: {},
      })
      store.set({ x: 10, y: 20 })
      expect(store.get()).toEqual({ x: 10, y: 20 })
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

    it('merges stored values with defaultValue for partial keys', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: 'default' },
      })
      // @ts-expect-error - test invalid value
      store.set({ count: 10 })
      expect(store.get()).toEqual({ count: 10, name: 'default' })
    })

    it('returns defaultValue when stored value fails validation', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
      })
      // @ts-expect-error - test invalid value
      store.set({ count: 'invalid' })
      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('returns defaultValue when any key is invalid', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
      })
      // @ts-expect-error - test invalid value
      store.set({ count: 'invalid', name: 'Test' })
      // With a single schema, entire validation fails so all defaults are returned
      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('returns defaultValue with strict schema when extra keys are present', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }).strict(),
        defaultValue: { count: 0, name: '' },
      })
      // @ts-expect-error - test invalid value
      store.set({ count: 1, name: 'ok', extra: true })
      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('applies schema transforms on get', () => {
      const store = createSchemaStore({
        schema: z.object({
          label: z.string().transform(s => s.trim()),
        }),
        defaultValue: { label: '' },
      })
      store.set({ label: '  hello  ' })
      expect(store.get()).toEqual({ label: 'hello' })
    })
  })

  describe('set', () => {
    it('stores values in sessionStorage', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
      })
      store.set({ count: 5, name: 'bob' })
      expect(store.get().count).toBe(5)
      expect(store.get().name).toBe('bob')
    })

    it('can set partial updates (only some keys)', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
      })
      // @ts-expect-error - test invalid value
      store.set({ count: 3 })
      expect(store.get().count).toBe(3)
      expect(store.get().name).toBe('')
    })

    it('stores string values as-is without extra JSON encoding', () => {
      const store = createSchemaStore({
        schema: z.record(z.string(), z.string()),
        defaultValue: {},
      })
      store.set({ name: 'plain' })
      expect(store.get().name).toBe('plain')
    })
  })

  describe('subscribe', () => {
    it('calls callback with current value when set is called', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
      })
      const callback = vi.fn()
      store.subscribe(callback)

      store.set({ count: 10, name: 'sub' })

      expect(callback).toHaveBeenCalled()
      expect(callback).toHaveBeenLastCalledWith({ count: 10, name: 'sub' })
      expect(store.get()).toEqual({ count: 10, name: 'sub' })
    })

    it('stops calling callback after unsubscribe', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
      })
      const callback = vi.fn()
      const unsubscribe = store.subscribe(callback)

      // @ts-expect-error - test invalid value
      store.set({ count: 1 })
      const callsAfterSet = callback.mock.calls.length

      unsubscribe()
      // @ts-expect-error - test invalid value
      store.set({ count: 2 })
      expect(callback).toHaveBeenCalledTimes(callsAfterSet)
    })

    it('calls callback with latest value after each set', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
      })
      const callback = vi.fn()
      store.subscribe(callback)

      store.set({ count: 5, name: 'test' })
      expect(callback).toHaveBeenLastCalledWith({ count: 5, name: 'test' })

      // @ts-expect-error - test invalid value
      store.set({ count: 0 })
      expect(callback).toHaveBeenLastCalledWith({ count: 0, name: '' })
    })
  })

  describe('onValidationError', () => {
    it('calls onValidationError with issues, value, and defaultValue', () => {
      const onValidationError = vi.fn()

      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
        onValidationError,
      })

      store.set({ count: 'invalid', name: 'test' })

      expect(store.get()).toEqual({ count: 0, name: '' })
      expect(onValidationError).toHaveBeenCalled()
      expect(onValidationError).toHaveBeenCalledWith(expect.objectContaining({
        defaultValue: { count: 0, name: '' },
        issues: expect.any(Array),
      }))
    })

    it('returns default value when onValidationError returns undefined', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
        onValidationError: () => undefined,
      })

      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('uses corrected value when onValidationError returns a valid value', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
        onValidationError: () => ({ count: 99, name: 'corrected' }),
      })

      // @ts-expect-error - test invalid value
      store.set({ count: 'invalid', name: 'test' })

      expect(store.get()).toEqual({ count: 99, name: 'corrected' })
    })

    it('returns default value when onValidationError returns an invalid value', () => {
      const store = createSchemaStore({
        schema: z.object({
          count: z.number(),
          name: z.string(),
        }),
        defaultValue: { count: 0, name: '' },
        // @ts-expect-error - test invalid value
        onValidationError: () => ({ count: 'still-invalid', name: 'test' }),
      })

      expect(store.get()).toEqual({ count: 0, name: '' })
    })
  })
})
