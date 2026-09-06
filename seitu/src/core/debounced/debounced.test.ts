import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createStore } from '../store'
import { createDebounced } from './index'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.restoreAllMocks())

describe('createDebounced', () => {
  it('returns initial value immediately via get()', () => {
    const store = createStore(10)
    const debounced = createDebounced(store, 100)
    expect(debounced.get()).toBe(10)
  })

  it('debounces notifications from the source', () => {
    const store = createStore(0)
    const debounced = createDebounced(store, 100)
    const callback = vi.fn()
    debounced.subscribe(callback)

    store.set(1)
    store.set(2)
    store.set(3)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith(3)
    expect(debounced.get()).toBe(3)
  })

  it('resets the timer on each source update', () => {
    const store = createStore(0)
    const debounced = createDebounced(store, 100)
    const callback = vi.fn()
    debounced.subscribe(callback)

    store.set(1)
    vi.advanceTimersByTime(80)
    expect(callback).not.toHaveBeenCalled()

    store.set(2)
    vi.advanceTimersByTime(80)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(20)
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith(2)
  })

  it('supports immediate subscribe option', () => {
    const store = createStore(5)
    const debounced = createDebounced(store, 100)
    const callback = vi.fn()
    debounced.subscribe(callback, { immediate: true })
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith(5)
  })

  it('unsubscribe stops receiving updates', () => {
    const store = createStore(0)
    const debounced = createDebounced(store, 100)
    const callback = vi.fn()
    const unsub = debounced.subscribe(callback)

    store.set(1)
    unsub()
    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()
  })

  it('lazily subscribes to source on first subscriber', () => {
    const store = createStore(0)
    const debounced = createDebounced(store, 100)

    store.set(1)
    vi.advanceTimersByTime(100)
    expect(debounced.get()).toBe(1)

    const callback = vi.fn()
    debounced.subscribe(callback)
    store.set(2)
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledWith(2)
  })

  it('cleans up source subscription when all subscribers leave', () => {
    const store = createStore(0)
    const debounced = createDebounced(store, 100)

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
    expect(debounced.get()).toBe(1)
  })

  it('handles multiple debounce cycles', () => {
    const store = createStore(0)
    const debounced = createDebounced(store, 50)
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

  it('re-syncs to the current source value when subscribed again after being idle', () => {
    const store = createStore(1)
    const debounced = createDebounced(store, 100)

    const unsubscribe = debounced.subscribe(() => {})
    unsubscribe()

    store.set(2)

    debounced.subscribe(() => {})
    expect(debounced.get()).toBe(2)
  })
})

describe('createDebounced cancel/flush', () => {
  it('flush emits the pending value immediately', () => {
    const store = createStore(0)
    const debounced = createDebounced(store, 100)
    const callback = vi.fn()
    debounced.subscribe(callback)

    store.set(1)
    debounced.flush()
    expect(callback).toHaveBeenCalledWith(1)
    expect(debounced.get()).toBe(1)

    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledOnce()
  })

  it('cancel drops the pending value', () => {
    const store = createStore(0)
    const debounced = createDebounced(store, 100)
    const callback = vi.fn()
    debounced.subscribe(callback)

    store.set(1)
    debounced.cancel()
    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()
    expect(debounced.get()).toBe(0)
  })

  it('flush and cancel are no-ops when nothing is pending', () => {
    const store = createStore(0)
    const debounced = createDebounced(store, 100)
    const callback = vi.fn()
    debounced.subscribe(callback)

    debounced.flush()
    debounced.cancel()
    expect(callback).not.toHaveBeenCalled()
  })

  it('forwards the source server snapshot', () => {
    const store = createStore(0)
    const source = {
      ...store,
      getServer: () => -1,
    }
    const debounced = createDebounced(source, 100)
    expect(debounced.getServer?.()).toBe(-1)
  })
})
