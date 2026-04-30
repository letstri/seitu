import { beforeEach, describe, expect, it } from 'vitest'
import * as z from 'zod'
import { createSchemaStore } from '../core/schema-store'
import { createWebStorageValue } from '../web/web-storage-value'
import { repairValueObjectWithDefault } from './validation'

const TEST_KEY = 'seitu-session-storage-value-test-key'

const value = createWebStorageValue({
  type: 'localStorage',
  schema: z.object({ a: z.number(), b: z.string() }),
  key: 'storage-key',
  defaultValue: { a: 0, b: 'default' },
  onValidationError: repairValueObjectWithDefault,
})
value.get() // { a: 0, b: 'default' }
window.localStorage.setItem('storage-key', JSON.stringify({ a: 1, b: 'test' }))
value.get() // { a: 1, b: 'default' }

describe('repairValueObjectWithDefault', () => {
  beforeEach(() => {
    Object.keys(window.localStorage).forEach(key => window.localStorage.removeItem(key))
  })

  it('returns defaultValue when key is not in localStorage', () => {
    const value = createWebStorageValue({
      type: 'localStorage',
      schema: z.object({
        a: z.number(),
        b: z.string(),
      }),
      key: TEST_KEY,
      defaultValue: {
        a: 0,
        b: 'default',
      },
      onValidationError: repairValueObjectWithDefault,
    })
    window.localStorage.setItem(TEST_KEY, JSON.stringify({
      a: 1,
    }))
    expect(value.get()).toEqual({
      a: 1,
      b: 'default',
    })
  })

  it('merges default for missing top-level keys when stored value has a nested object', () => {
    const value = createWebStorageValue({
      type: 'localStorage',
      schema: z.object({
        meta: z.object({ x: z.number(), y: z.string() }),
        b: z.string(),
      }),
      key: TEST_KEY,
      defaultValue: {
        meta: { x: 0, y: 'y-default' },
        b: 'default',
      },
      onValidationError: repairValueObjectWithDefault,
    })
    window.localStorage.setItem(
      TEST_KEY,
      JSON.stringify({
        meta: 1,
        b: 'b-from-storage',
      }),
    )
    expect(value.get()).toEqual({
      meta: { x: 0, y: 'y-default' },
      b: 'b-from-storage',
    })
  })

  it('returns default when a field expects string or null but storage has an object', () => {
    const value = createWebStorageValue({
      type: 'localStorage',
      schema: z.object({
        token: z.string().nullable(),
      }),
      key: TEST_KEY,
      defaultValue: {
        token: null,
      },
      onValidationError: repairValueObjectWithDefault,
    })
    window.localStorage.setItem(
      TEST_KEY,
      JSON.stringify({
        token: { unexpected: 'object' },
      }),
    )
    expect(value.get()).toEqual({
      token: null,
    })
  })

  it('returns default when an object field has different nested keys in storage', () => {
    const value = createWebStorageValue({
      type: 'localStorage',
      schema: z.object({
        preferences: z.object({
          theme: z.string(),
          language: z.string(),
        }),
      }),
      key: TEST_KEY,
      defaultValue: {
        preferences: {
          theme: 'light',
          language: 'en',
        },
      },
      onValidationError: repairValueObjectWithDefault,
    })
    window.localStorage.setItem(
      TEST_KEY,
      JSON.stringify({
        preferences: {
          timezone: 'UTC',
        },
      }),
    )
    expect(value.get()).toEqual({
      preferences: {
        theme: 'light',
        language: 'en',
      },
    })
  })
})

describe('repairValueObjectWithDefault with createSchemaStore', () => {
  it('repairs partially invalid stored data by merging with defaults', () => {
    const store = createSchemaStore({
      schema: z.object({
        count: z.number(),
        name: z.string(),
      }),
      defaultValue: { count: 0, name: '' },
      onValidationError: repairValueObjectWithDefault,
    })
    // @ts-expect-error - test invalid value
    store.set({ count: 'invalid', name: 'alice' })

    expect(store.get()).toEqual({ count: 0, name: 'alice' })
  })

  it('returns full default when stored value is completely invalid', () => {
    const store = createSchemaStore({
      schema: z.object({
        count: z.number(),
        name: z.string(),
      }),
      defaultValue: { count: 0, name: 'default' },
      onValidationError: repairValueObjectWithDefault,
    })
    // @ts-expect-error - test invalid value
    store.set({ count: 'bad', name: 42 })

    expect(store.get()).toEqual({ count: 0, name: 'default' })
  })

  it('keeps all valid keys when stored data has extra unknown keys', () => {
    const store = createSchemaStore({
      schema: z.object({
        count: z.number(),
        name: z.string(),
      }).strict(),
      defaultValue: { count: 0, name: '' },
      onValidationError: repairValueObjectWithDefault,
    })
    // @ts-expect-error - test invalid value
    store.set({ count: 5, name: 'bob', extra: true })

    expect(store.get()).toEqual({ count: 5, name: 'bob' })
  })

  it('falls back to full default when nested object has wrong shape', () => {
    const store = createSchemaStore({
      schema: z.object({
        meta: z.object({ x: z.number(), y: z.string() }),
        label: z.string(),
      }),
      defaultValue: { meta: { x: 0, y: 'y-default' }, label: '' },
      onValidationError: repairValueObjectWithDefault,
    })
    // @ts-expect-error - test invalid value
    store.set({ meta: { wrong: 'shape' }, label: 'ok' })

    // repair keeps meta (both are typeof 'object') but re-validation still fails,
    // so the full default is returned
    expect(store.get()).toEqual({ meta: { x: 0, y: 'y-default' }, label: '' })
  })
})
