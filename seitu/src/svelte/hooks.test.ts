import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createStore } from '../core/store'
import { createWebStorage } from '../web/web-storage'
import { createWebStorageValue } from '../web/web-storage-value'
import { useSubscription } from './hooks'

afterEach(() => {
  window.sessionStorage.clear()
})

const TEST_KEY = 'seitu-svelte-hooks-test-key'

describe('useSubscription no selector', () => {
  it('should return the initial value', () => {
    const store = createStore(1)
    const value = useSubscription(store)
    expect(get(value)).toBe(1)
  })

  it('should accept a factory function', () => {
    const value = useSubscription(() => createStore(5))
    expect(get(value)).toBe(5)
  })

  it('should emit updates to subscribers when the source changes', () => {
    const store = createStore(0)
    const value = useSubscription(store)

    const seen: number[] = []
    const unsubscribe = value.subscribe(v => seen.push(v))
    expect(seen).toEqual([0])

    store.set(42)
    expect(get(value)).toBe(42)
    expect(seen).toEqual([0, 42])

    unsubscribe()
  })

  it('should reflect createWebStorageValue updates', () => {
    const storage = createWebStorageValue({ type: 'sessionStorage', schema: z.number(), key: TEST_KEY, defaultValue: 0 })
    const value = useSubscription(storage)

    const seen: number[] = []
    const unsubscribe = value.subscribe(v => seen.push(v))
    expect(seen).toEqual([0])

    storage.set(7)
    expect(get(value)).toBe(7)
    expect(seen).toEqual([0, 7])

    unsubscribe()
  })
})

describe('useSubscription with selector', () => {
  it('should derive a subset of the value and skip unrelated changes', () => {
    const storage = createWebStorage({
      type: 'sessionStorage',
      schemas: { count: z.number(), name: z.string() },
      defaultValues: { count: 0, name: '' },
    })
    const count = useSubscription(storage, { selector: v => v.count })

    const seen: number[] = []
    const unsubscribe = count.subscribe(v => seen.push(v))
    expect(seen).toEqual([0])

    storage.set({ count: 5, name: 'a' })
    expect(get(count)).toBe(5)
    expect(seen).toEqual([0, 5])

    // Selected value unchanged -> no emission
    storage.set({ count: 5, name: 'b' })
    expect(seen).toEqual([0, 5])

    unsubscribe()
  })
})

describe('useSubscription with custom isEqual', () => {
  it('should use the custom comparator instead of deepEqual', () => {
    const storage = createWebStorage({
      type: 'sessionStorage',
      schemas: { count: z.number(), name: z.string() },
      defaultValues: { count: 0, name: '' },
    })
    const value = useSubscription(storage, { isEqual: (a, b) => a.count === b.count })

    const seen: { count: number, name: string }[] = []
    const unsubscribe = value.subscribe(v => seen.push(v))
    expect(seen).toHaveLength(1)

    // count unchanged -> treated as equal
    storage.set({ count: 0, name: 'changed' })
    expect(seen).toHaveLength(1)

    storage.set({ count: 1, name: 'changed' })
    expect(seen).toHaveLength(2)

    unsubscribe()
  })
})

describe('useSubscription cleanup', () => {
  it('should subscribe lazily and unsubscribe when the last subscriber leaves', () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn(() => unsubscribe)
    const sub = {
      'get': () => 1,
      'subscribe': subscribe,
      '~': { notify: () => {}, output: null as unknown as number },
    }

    const value = useSubscription(sub)
    // No subscriber yet -> the underlying source is not subscribed
    expect(subscribe).not.toHaveBeenCalled()

    const dispose = value.subscribe(() => {})
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(unsubscribe).not.toHaveBeenCalled()

    dispose()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
