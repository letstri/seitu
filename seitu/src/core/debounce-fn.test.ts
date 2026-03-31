import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebounceFn } from './debounce-fn'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.restoreAllMocks())

describe('createDebounceFn', () => {
  it('get() returns undefined before first call', () => {
    const debounced = createDebounceFn(() => 42, 100)
    expect(debounced.get()).toBeUndefined()
  })

  it('debounces calls and updates state with return value', () => {
    const debounced = createDebounceFn((x: number) => x * 2, 100)

    debounced(1)
    debounced(2)
    debounced(3)
    expect(debounced.get()).toBeUndefined()

    vi.advanceTimersByTime(100)
    expect(debounced.get()).toBe(6)
  })

  it('notifies subscribers with the return value', () => {
    const debounced = createDebounceFn((x: string) => x.toUpperCase(), 100)
    const callback = vi.fn()
    debounced.subscribe(callback)

    debounced('hello')
    debounced('world')
    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('WORLD')
  })

  it('supports async return values', async () => {
    const debounced = createDebounceFn(async (x: string) => x.toUpperCase(), 100)
    const callback = vi.fn()
    debounced.subscribe(callback)

    debounced('world')
    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledTimes(1)
    const promise = callback.mock.calls[0][0]
    expect(promise).toBeInstanceOf(Promise)
    await expect(promise).resolves.toBe('WORLD')
    await expect(debounced.get()).resolves.toBe('WORLD')
  })

  it('resets the timer on each call', () => {
    const fn = vi.fn((x: number) => x)
    const debounced = createDebounceFn(fn, 100)

    debounced(1)
    vi.advanceTimersByTime(80)
    debounced(2)
    vi.advanceTimersByTime(80)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(20)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(2)
  })

  it('is callable and subscribable at the same time', () => {
    const debounced = createDebounceFn((a: number, b: number) => a + b, 50)
    const callback = vi.fn()
    debounced.subscribe(callback)

    debounced(1, 2)
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledWith(3)
    expect(debounced.get()).toBe(3)

    debounced(10, 20)
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledWith(30)
    expect(debounced.get()).toBe(30)
  })

  it('unsubscribe stops receiving updates', () => {
    const debounced = createDebounceFn(() => 1, 100)
    const callback = vi.fn()
    const unsub = debounced.subscribe(callback)

    unsub()
    debounced()
    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()
  })

  it('supports immediate subscribe option', () => {
    const debounced = createDebounceFn(() => 1, 100)
    const callback = vi.fn()
    debounced.subscribe(callback, { immediate: true })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(undefined)
  })
})
