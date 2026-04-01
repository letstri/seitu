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
})
