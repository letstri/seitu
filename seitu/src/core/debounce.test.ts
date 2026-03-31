import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebounce } from './debounce'
import { createStore } from './store'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.restoreAllMocks())

describe('createDebounce', () => {
  it('returns initial value immediately via get()', () => {
    const store = createStore(10)
    const debounced = createDebounce(store, 100)
    expect(debounced.get()).toBe(10)
  })

  it('debounces notifications from the source', () => {
    const store = createStore(0)
    const debounced = createDebounce(store, 100)
    const callback = vi.fn()
    debounced.subscribe(callback)

    store.set(1)
    store.set(2)
    store.set(3)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(3)
    expect(debounced.get()).toBe(3)
  })

  it('resets the timer on each source update', () => {
    const store = createStore(0)
    const debounced = createDebounce(store, 100)
    const callback = vi.fn()
    debounced.subscribe(callback)

    store.set(1)
    vi.advanceTimersByTime(80)
    expect(callback).not.toHaveBeenCalled()

    store.set(2)
    vi.advanceTimersByTime(80)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(20)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(2)
  })

  it('supports immediate subscribe option', () => {
    const store = createStore(5)
    const debounced = createDebounce(store, 100)
    const callback = vi.fn()
    debounced.subscribe(callback, { immediate: true })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(5)
  })

  it('unsubscribe stops receiving updates', () => {
    const store = createStore(0)
    const debounced = createDebounce(store, 100)
    const callback = vi.fn()
    const unsub = debounced.subscribe(callback)

    store.set(1)
    unsub()
    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()
  })

  it('lazily subscribes to source on first subscriber', () => {
    const store = createStore(0)
    const debounced = createDebounce(store, 100)

    // No subscriber yet — source updates should not schedule anything
    store.set(1)
    vi.advanceTimersByTime(100)
    expect(debounced.get()).toBe(0)

    // Now subscribe
    const callback = vi.fn()
    debounced.subscribe(callback)
    store.set(2)
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledWith(2)
  })

  it('cleans up source subscription when all subscribers leave', () => {
    const store = createStore(0)
    const debounced = createDebounce(store, 100)

    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const unsub1 = debounced.subscribe(cb1)
    const unsub2 = debounced.subscribe(cb2)

    unsub1()
    unsub2()

    store.set(1)
    vi.advanceTimersByTime(100)
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).not.toHaveBeenCalled()
    expect(debounced.get()).toBe(0)
  })

  it('handles multiple debounce cycles', () => {
    const store = createStore(0)
    const debounced = createDebounce(store, 50)
    const callback = vi.fn()
    debounced.subscribe(callback)

    store.set(1)
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledWith(1)

    store.set(2)
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledWith(2)
    expect(callback).toHaveBeenCalledTimes(2)
  })
})
