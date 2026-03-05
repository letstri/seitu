import { describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createSchemaStore } from './schema-store'

function createMemoryProvider() {
  const state = new Map<string, unknown>()
  return {
    get: () => Object.fromEntries(state.entries()) as any,
    set: (value: any) => {
      state.clear()
      for (const [key, v] of Object.entries(value)) {
        state.set(key, v)
      }
    },
  }
}

describe('createSchemaStore', () => {
  describe('get', () => {
    it('returns defaultValues when keys are not in sessionStorage', () => {
      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
        provider: createMemoryProvider(),
      })
      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('returns parsed values when keys exist with valid stored data', () => {
      const provider = createMemoryProvider()

      provider.set({ count: 42, name: 'alice' })

      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
        provider,
      })
      expect(store.get()).toEqual({ count: 42, name: 'alice' })
    })

    it('merges stored values with defaultValues for partial keys', () => {
      const provider = createMemoryProvider()
      provider.set({ count: 10 })

      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: 'default' },
        provider,
      })
      expect(store.get()).toEqual({ count: 10, name: 'default' })
    })

    it('returns defaultValues when stored value fails validation', () => {
      const provider = createMemoryProvider()
      provider.set({ count: 'invalid' })

      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
        provider,
      })
      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('returns default for invalid key and keeps valid key', () => {
      const provider = createMemoryProvider()
      provider.set({ count: 'invalid', name: 'Test' })

      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
        provider,
      })
      expect(store.get()).toEqual({ count: 0, name: 'Test' })
    })
  })

  describe('set', () => {
    it('stores values in sessionStorage', () => {
      const provider = createMemoryProvider()

      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
        provider,
      })
      store.set({ count: 5, name: 'bob' })
      expect(provider.get().count).toBe(5)
      expect(provider.get().name).toBe('bob')
    })

    it('can set partial updates (only some keys)', () => {
      const provider = createMemoryProvider()

      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
        provider,
      })
      store.set({ count: 3 })
      expect(provider.get().count).toBe(3)
      expect(store.get().count).toBe(3)
      expect(store.get().name).toBe('')
    })

    it('stores string values as-is without extra JSON encoding', () => {
      const provider = createMemoryProvider()

      const store = createSchemaStore({
        schemas: {
          name: z.string(),
        },
        defaultValues: { name: '' },
        provider,
      })
      store.set({ name: 'plain' })
      expect(provider.get().name).toBe('plain')
    })
  })

  describe('subscribe', () => {
    it('calls callback with current value when set is called', () => {
      const provider = createMemoryProvider()

      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
        provider,
      })
      const callback = vi.fn()
      store.subscribe(callback)

      store.set({ count: 10, name: 'sub' })

      expect(callback).toHaveBeenCalled()
      expect(callback).toHaveBeenLastCalledWith({ count: 10, name: 'sub' })
      expect(store.get()).toEqual({ count: 10, name: 'sub' })
    })

    it('stops calling callback after unsubscribe', () => {
      const provider = createMemoryProvider()

      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
        provider,
      })
      const callback = vi.fn()
      const unsubscribe = store.subscribe(callback)

      store.set({ count: 1 })
      const callsAfterSet = callback.mock.calls.length

      unsubscribe()
      store.set({ count: 2 })
      expect(callback).toHaveBeenCalledTimes(callsAfterSet)
    })

    it('calls callback with latest value after each set', () => {
      const provider = createMemoryProvider()
      const store = createSchemaStore({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
        provider,
      })
      const callback = vi.fn()
      store.subscribe(callback)

      store.set({ count: 5, name: 'test' })
      expect(callback).toHaveBeenLastCalledWith({ count: 5, name: 'test' })

      store.set({ count: 0 })
      expect(callback).toHaveBeenLastCalledWith({ count: 0, name: '' })
    })
  })
})
