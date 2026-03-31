import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createThrottleFn } from './throttle-fn'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.restoreAllMocks())

describe('createThrottleFn', () => {
  it('get() returns undefined before first call', () => {
    const throttled = createThrottleFn(() => 42, 100)
    expect(throttled.get()).toBeUndefined()
  })

  it('fires immediately on first call', () => {
    const fn = vi.fn((x: number) => x * 2)
    const throttled = createThrottleFn(fn, 100)

    throttled(5)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(5)
    expect(throttled.get()).toBe(10)
  })

  it('throttles subsequent calls within the interval', () => {
    const fn = vi.fn((x: number) => x)
    const throttled = createThrottleFn(fn, 100)

    throttled(1) // fires immediately
    throttled(2) // throttled
    throttled(3) // throttled (replaces 2)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(throttled.get()).toBe(1)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(3)
    expect(throttled.get()).toBe(3)
  })

  it('does not fire trailing if no calls during interval', () => {
    const fn = vi.fn()
    const throttled = createThrottleFn(fn, 100)

    throttled()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers with the return value', () => {
    const throttled = createThrottleFn((x: string) => x.toUpperCase(), 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    throttled('hello')
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('HELLO')

    throttled('world')
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith('WORLD')
  })

  it('supports async return values', async () => {
    const throttled = createThrottleFn(async (x: string) => x.toUpperCase(), 100)
    const callback = vi.fn()
    throttled.subscribe(callback)

    throttled('world')
    expect(callback).toHaveBeenCalledTimes(1)
    const promise = callback.mock.calls[0][0]
    expect(promise).toBeInstanceOf(Promise)
    await expect(promise).resolves.toBe('WORLD')
    await expect(throttled.get()).resolves.toBe('WORLD')
  })

  it('handles multiple throttle cycles', () => {
    const fn = vi.fn((x: number) => x)
    const throttled = createThrottleFn(fn, 50)

    // First cycle
    throttled(1)
    throttled(2)
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(throttled.get()).toBe(2)

    // Second cycle
    throttled(3)
    throttled(4)
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(4)
    expect(throttled.get()).toBe(4)
  })

  it('is callable and subscribable at the same time', () => {
    const throttled = createThrottleFn((a: number, b: number) => a + b, 50)
    const callback = vi.fn()
    throttled.subscribe(callback)

    throttled(1, 2)
    expect(callback).toHaveBeenCalledWith(3)
    expect(throttled.get()).toBe(3)

    vi.advanceTimersByTime(50)

    throttled(10, 20)
    expect(callback).toHaveBeenCalledWith(30)
    expect(throttled.get()).toBe(30)
  })

  it('unsubscribe stops receiving updates', () => {
    const throttled = createThrottleFn(() => 1, 100)
    const callback = vi.fn()
    const unsub = throttled.subscribe(callback)

    unsub()
    throttled()
    expect(callback).not.toHaveBeenCalled()
  })

  it('supports immediate subscribe option', () => {
    const throttled = createThrottleFn(() => 1, 100)
    const callback = vi.fn()
    throttled.subscribe(callback, { immediate: true })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(undefined)
  })

  it('passes multiple arguments through', () => {
    const fn = vi.fn()
    const throttled = createThrottleFn(fn, 100)

    throttled('a', 1, true)
    expect(fn).toHaveBeenCalledWith('a', 1, true)
  })
})
