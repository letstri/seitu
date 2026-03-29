import { describe, expect, it, vi } from 'vitest'
import { createSubscription } from './subscription'

describe('createSubscription', () => {
  it('notifies subscribers when notify is called', () => {
    const { subscribe, notify } = createSubscription()
    const a = vi.fn()
    const b = vi.fn()
    subscribe(a)
    subscribe(b)
    notify()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('invokes immediate callback before first notify when immediate is true', () => {
    const { subscribe, notify } = createSubscription()
    const callback = vi.fn()
    subscribe(callback, { immediate: true })
    expect(callback).toHaveBeenCalledTimes(1)
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
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('runs onFirstSubscribe when the first subscriber is added', () => {
    const onFirstSubscribe = vi.fn(() => {})
    const { subscribe } = createSubscription({ onFirstSubscribe })
    expect(onFirstSubscribe).not.toHaveBeenCalled()
    subscribe(vi.fn())
    expect(onFirstSubscribe).toHaveBeenCalledTimes(1)
  })

  it('does not run onFirstSubscribe again while subscribers remain', () => {
    const onFirstSubscribe = vi.fn(() => {})
    const { subscribe } = createSubscription({ onFirstSubscribe })
    subscribe(vi.fn())
    subscribe(vi.fn())
    expect(onFirstSubscribe).toHaveBeenCalledTimes(1)
  })

  it('runs onFirstSubscribe again after all subscribers have unsubscribed and someone subscribes again', () => {
    const teardown = vi.fn()
    const onFirstSubscribe = vi.fn(() => teardown)
    const { subscribe } = createSubscription({ onFirstSubscribe })

    const unsub = subscribe(vi.fn())
    unsub()
    expect(teardown).toHaveBeenCalledTimes(1)

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
