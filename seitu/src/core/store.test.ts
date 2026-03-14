import { describe, expect, it, vi } from 'vitest'
import { createStore } from './store'

describe('createStore', () => {
  describe('get', () => {
    it('returns initial state', () => {
      const store = createStore({ count: 0, name: '' })
      expect(store.get()).toEqual({ count: 0, name: '' })
    })

    it('accepts primitive initial value', () => {
      expect(createStore(42).get()).toBe(42)
      expect(createStore('').get()).toBe('')
      expect(createStore(null).get()).toBe(null)
    })

    it('returns current state after set', () => {
      const store = createStore(0)
      store.set(1)
      expect(store.get()).toBe(1)
    })
  })

  describe('set', () => {
    it('set(value) updates state', () => {
      const store = createStore(0)
      store.set(1)
      expect(store.get()).toBe(1)
    })

    it('set(updater) updates state from previous', () => {
      const store = createStore({ count: 0 })
      store.set(prev => ({ ...prev, count: prev.count + 1 }))
      expect(store.get()).toEqual({ count: 1 })
    })

    it('does not notify when set to same reference', () => {
      const store = createStore({ n: 0 })
      const callback = vi.fn()
      store.subscribe(callback)
      store.set(store.get())
      expect(callback).toHaveBeenCalledTimes(0)
    })

    it('does not notify when updater returns same reference', () => {
      const store = createStore({ n: 0 })
      const callback = vi.fn()
      store.subscribe(callback)
      store.set(prev => prev)
      expect(callback).toHaveBeenCalledTimes(0)
    })
  })

  describe('subscribe', () => {
    it('calls callback on set and returns unsubscribe', () => {
      const store = createStore(0)
      const callback = vi.fn()
      const unsub = store.subscribe(callback)
      expect(callback).not.toHaveBeenCalled()
      store.set(1)
      expect(callback).toHaveBeenLastCalledWith(1)
      store.set(2)
      expect(callback).toHaveBeenLastCalledWith(2)
      unsub()
      store.set(3)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('notifies all subscribers', () => {
      const store = createStore(0)
      const a = vi.fn()
      const b = vi.fn()
      store.subscribe(a)
      store.subscribe(b)
      store.set(1)
      expect(a).toHaveBeenCalledWith(1)
      expect(b).toHaveBeenCalledWith(1)
    })

    it('unsubscribing one does not affect others', () => {
      const store = createStore(0)
      const a = vi.fn()
      const b = vi.fn()
      store.subscribe(a)
      const unsubB = store.subscribe(b)
      unsubB()
      store.set(1)
      expect(a).toHaveBeenCalledWith(1)
      expect(b).not.toHaveBeenCalled()
    })

    it('callback receives latest state', () => {
      const store = createStore({ step: 0 })
      const received: unknown[] = []
      store.subscribe(state => received.push(state))
      store.set({ step: 1 })
      store.set(prev => ({ ...prev, step: 2 }))
      expect(received).toEqual([{ step: 1 }, { step: 2 }])
    })
  })
})
