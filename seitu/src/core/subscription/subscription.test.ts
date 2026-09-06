import { describe, expect, it, vi } from 'vitest'

import { createSubscription } from './index'

describe('createSubscription', () => {
  it('notifies subscribers when notify is called', () => {
    const { subscribe, notify } = createSubscription()
    const a = vi.fn()
    const b = vi.fn()
    subscribe(a)
    subscribe(b)
    notify()
    expect(a).toHaveBeenCalledOnce()
    expect(b).toHaveBeenCalledOnce()
  })

  it('invokes immediate callback before first notify when immediate is true', () => {
    const { subscribe, notify } = createSubscription()
    const callback = vi.fn()
    subscribe(callback, { immediate: true })
    expect(callback).toHaveBeenCalledOnce()
    notify()
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('does not invoke callback before notify when immediate is omitted or false', () => {
    const { subscribe, notify } = createSubscription()
    const a = vi.fn()
    const b = vi.fn()
    subscribe(a)
    subscribe(b, { immediate: false })
    expect(a).not.toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
    notify()
    expect(a).toHaveBeenCalledOnce()
    expect(b).toHaveBeenCalledOnce()
  })

  it('runs onFirstSubscribe when the first subscriber is added', () => {
    const onFirstSubscribe = vi.fn(() => {})
    const { subscribe } = createSubscription({ onFirstSubscribe })
    expect(onFirstSubscribe).not.toHaveBeenCalled()
    subscribe(vi.fn())
    expect(onFirstSubscribe).toHaveBeenCalledOnce()
  })

  it('does not run onFirstSubscribe again while subscribers remain', () => {
    const onFirstSubscribe = vi.fn(() => {})
    const { subscribe } = createSubscription({ onFirstSubscribe })
    subscribe(vi.fn())
    subscribe(vi.fn())
    expect(onFirstSubscribe).toHaveBeenCalledOnce()
  })

  it('runs onFirstSubscribe again after all subscribers have unsubscribed and someone subscribes again', () => {
    const teardown = vi.fn()
    const onFirstSubscribe = vi.fn(() => teardown)
    const { subscribe } = createSubscription({ onFirstSubscribe })

    const unsub = subscribe(vi.fn())
    unsub()
    expect(teardown).toHaveBeenCalledOnce()

    subscribe(vi.fn())
    expect(onFirstSubscribe).toHaveBeenCalledTimes(2)
  })

  it('supports onFirstSubscribe with no return value', () => {
    const onFirstSubscribe = vi.fn()
    const { subscribe } = createSubscription({ onFirstSubscribe })
    const unsub = subscribe(vi.fn())
    expect(() => unsub()).not.toThrow()
  })
})

describe('createSubscription robustness', () => {
  it('keeps notifying other subscribers when one throws, then rethrows', () => {
    const { subscribe, notify } = createSubscription()
    const a = vi.fn(() => {
      throw new Error('boom')
    })
    const b = vi.fn()
    subscribe(a)
    subscribe(b)

    expect(() => notify()).toThrow('boom')
    expect(b).toHaveBeenCalledOnce()
  })

  it('does not visit subscribers added during notification', () => {
    const { subscribe, notify } = createSubscription()
    const late = vi.fn()
    subscribe(() => subscribe(late))

    notify()
    expect(late).not.toHaveBeenCalled()
    notify()
    expect(late).toHaveBeenCalledOnce()
  })

  it('exposes the live subscriber count and tolerates double unsubscribe', () => {
    const cleanup = vi.fn()
    const sub = createSubscription({ onFirstSubscribe: () => cleanup })
    const unsubA = sub.subscribe(() => {})
    const unsubB = sub.subscribe(() => {})
    expect(sub.size).toBe(2)

    unsubA()
    unsubA()
    expect(sub.size).toBe(1)
    expect(cleanup).not.toHaveBeenCalled()

    unsubB()
    expect(sub.size).toBe(0)
    expect(cleanup).toHaveBeenCalledOnce()
  })
})
