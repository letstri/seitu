import { beforeEach, describe, expect, it } from 'vitest'
import * as z from 'zod'
import { createWebStorageValue } from '../web/web-storage-value'
import { repairWebStorageValueObjectWithDefault } from './validation'

const TEST_KEY = 'seitu-session-storage-value-test-key'

const value = createWebStorageValue({
  type: 'localStorage',
  schema: z.object({ a: z.number(), b: z.string() }),
  key: 'storage-key',
  defaultValue: { a: 0, b: 'default' },
  onValidationError: repairWebStorageValueObjectWithDefault,
})
value.get() // { a: 0, b: 'default' }
window.localStorage.setItem('storage-key', JSON.stringify({ a: 1, b: 'test' }))
value.get() // { a: 1, b: 'default' }

describe('repairWebStorageValueObjectWithDefault', () => {
  beforeEach(() => {
    window.localStorage.clear()
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
      onValidationError: repairWebStorageValueObjectWithDefault,
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
      onValidationError: repairWebStorageValueObjectWithDefault,
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
      onValidationError: repairWebStorageValueObjectWithDefault,
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
      onValidationError: repairWebStorageValueObjectWithDefault,
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
