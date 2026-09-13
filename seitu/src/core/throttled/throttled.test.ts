import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createStore } from '../store'
import { createThrottled } from './index'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.restoreAllMocks())

describe('createThrottled', () => {
  it('returns initial value immediately via get()', () => {
    const store = createStore(10)
    const throttled = createThrottled(store, 100)
    expect(throttled.get()).toBe(10)
  })

  it('fires immediately on first source update', () => {
    const store = createStore(0)
    const throttled = createThrottled(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    store.set(1)
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith(1)
    expect(throttled.get()).toBe(1)
  })

  it('throttles subsequent updates within the interval', () => {
    const store = createStore(0)
    const throttled = createThrottled(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    store.set(1) // fires immediately
    store.set(2)
    store.set(3)
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith(1)

    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith(3)
    expect(throttled.get()).toBe(3)
  })

  it('does not fire trailing if no updates during interval', () => {
    const store = createStore(0)
    const throttled = createThrottled(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    store.set(1)
    expect(callback).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledOnce()
  })

  it('handles multiple throttle cycles', () => {
    const store = createStore(0)
    const throttled = createThrottled(store, 50)
    const callback = vi.fn()
    throttled.subscribe(callback)

    store.set(1)
    store.set(2)
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith(1)

    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith(2)

    store.set(3)
    expect(callback).toHaveBeenCalledTimes(3)
    expect(callback).toHaveBeenCalledWith(3)

    store.set(4)
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(4)
    expect(callback).toHaveBeenCalledWith(4)
  })

  it('supports immediate subscribe option', () => {
    const store = createStore(5)
    const throttled = createThrottled(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback, { immediate: true })
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith(5)
  })

  it('unsubscribe stops receiving updates', () => {
    const store = createStore(0)
    const throttled = createThrottled(store, 100)
    const callback = vi.fn()
    const unsub = throttled.subscribe(callback)

    unsub()
    store.set(1)
    expect(callback).not.toHaveBeenCalled()
  })

  it('lazily subscribes to source on first subscriber', () => {
    const store = createStore(0)
    const throttled = createThrottled(store, 100)

    store.set(1)
    expect(throttled.get()).toBe(1)

    const callback = vi.fn()
    throttled.subscribe(callback)
    store.set(2)
    expect(callback).toHaveBeenCalledWith(2)
  })

  it('cleans up source subscription when all subscribers leave', () => {
    const store = createStore(0)
    const throttled = createThrottled(store, 100)

    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const unsub1 = throttled.subscribe(cb1)
    const unsub2 = throttled.subscribe(cb2)

    unsub1()
    unsub2()

    store.set(1)
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).not.toHaveBeenCalled()
    expect(throttled.get()).toBe(1)
  })

  it('re-syncs to the current source value when subscribed again after being idle', () => {
    const store = createStore(1)
    const throttled = createThrottled(store, 100)

    const unsubscribe = throttled.subscribe(() => {})
    unsubscribe()

    store.set(2)

    throttled.subscribe(() => {})
    expect(throttled.get()).toBe(2)
  })
})

describe('createThrottled cancel/flush', () => {
  it('flush emits the trailing value immediately', () => {
    const store = createStore(0)
    const throttled = createThrottled(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    store.set(1)
    store.set(2)
    expect(callback).toHaveBeenCalledOnce()

    throttled.flush()
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith(2)

    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('cancel drops the trailing value and reopens the window', () => {
    const store = createStore(0)
    const throttled = createThrottled(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    store.set(1)
    store.set(2)
    throttled.cancel()
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledOnce()

    store.set(3)
    expect(callback).toHaveBeenLastCalledWith(3)
  })
})
