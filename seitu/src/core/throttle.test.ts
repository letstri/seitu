import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from './store'
import { createThrottle } from './throttle'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.restoreAllMocks())

describe('createThrottle', () => {
  it('returns initial value immediately via get()', () => {
    const store = createStore(10)
    const throttled = createThrottle(store, 100)
    expect(throttled.get()).toBe(10)
  })

  it('fires immediately on first source update', () => {
    const store = createStore(0)
    const throttled = createThrottle(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    store.set(1)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(1)
    expect(throttled.get()).toBe(1)
  })

  it('throttles subsequent updates within the interval', () => {
    const store = createStore(0)
    const throttled = createThrottle(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    store.set(1) // fires immediately
    store.set(2) // throttled
    store.set(3) // throttled
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(1)

    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith(3)
    expect(throttled.get()).toBe(3)
  })

  it('does not fire trailing if no updates during interval', () => {
    const store = createStore(0)
    const throttled = createThrottle(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    store.set(1)
    expect(callback).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('handles multiple throttle cycles', () => {
    const store = createStore(0)
    const throttled = createThrottle(store, 50)
    const callback = vi.fn()
    throttled.subscribe(callback)

    // First cycle
    store.set(1)
    store.set(2)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(1)

    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith(2)

    // Second cycle
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
    const throttled = createThrottle(store, 100)
    const callback = vi.fn()
    throttled.subscribe(callback, { immediate: true })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(5)
  })

  it('unsubscribe stops receiving updates', () => {
    const store = createStore(0)
    const throttled = createThrottle(store, 100)
    const callback = vi.fn()
    const unsub = throttled.subscribe(callback)

    unsub()
    store.set(1)
    expect(callback).not.toHaveBeenCalled()
  })

  it('lazily subscribes to source on first subscriber', () => {
    const store = createStore(0)
    const throttled = createThrottle(store, 100)

    store.set(1)
    expect(throttled.get()).toBe(0)

    const callback = vi.fn()
    throttled.subscribe(callback)
    store.set(2)
    expect(callback).toHaveBeenCalledWith(2)
  })

  it('cleans up source subscription when all subscribers leave', () => {
    const store = createStore(0)
    const throttled = createThrottle(store, 100)

    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const unsub1 = throttled.subscribe(cb1)
    const unsub2 = throttled.subscribe(cb2)

    unsub1()
    unsub2()

    store.set(1)
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).not.toHaveBeenCalled()
    expect(throttled.get()).toBe(0)
  })
})
