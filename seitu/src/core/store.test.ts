import { describe, expect, it, vi } from 'vitest'
import { createComputed, createStore } from './store'

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

describe('createComputed', () => {
  describe('get', () => {
    it('returns transformed value from source', () => {
      const source = createStore({ a: 1, b: 2 })
      const derived = createComputed(source, s => s.a + s.b)
      expect(derived.get()).toBe(3)
    })

    it('updates when source updates', () => {
      const source = createStore({ a: 1, b: 2 })
      const derived = createComputed(source, s => s.a + s.b)
      source.set({ a: 2, b: 3 })
      expect(derived.get()).toBe(5)
    })

    it('supports any transform (e.g. object, string)', () => {
      const source = createStore({ name: 'a', count: 2 })
      const label = createComputed(source, s => `${s.name}:${s.count}`)
      const doubled = createComputed(source, s => s.count * 2)
      expect(label.get()).toBe('a:2')
      expect(doubled.get()).toBe(4)
    })
  })

  describe('subscribe', () => {
    it('notifies when source updates', () => {
      const source = createStore(0)
      const doubled = createComputed(source, n => n * 2)
      const callback = vi.fn()
      doubled.subscribe(callback)
      expect(callback).not.toHaveBeenCalled()
      source.set(1)
      expect(callback).toHaveBeenLastCalledWith(2)
      source.set(3)
      expect(callback).toHaveBeenLastCalledWith(6)
    })

    it('unsubscribe stops notifications', () => {
      const source = createStore(0)
      const derived = createComputed(source, n => n + 1)
      const callback = vi.fn()
      const unsub = derived.subscribe(callback)
      source.set(1)
      expect(callback).toHaveBeenCalledWith(2)
      unsub()
      source.set(2)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('callback receives latest computed value', () => {
      const source = createStore({ x: 0 })
      const derived = createComputed(source, s => s.x * 10)
      const received: number[] = []
      derived.subscribe(v => received.push(v))
      source.set({ x: 1 })
      source.set({ x: 2 })
      expect(received).toEqual([10, 20])
    })
  })

  describe('computed shape', () => {
    it('has get and subscribe, no set', () => {
      const source = createStore(0)
      const derived = createComputed(source, n => n)
      expect(derived).toHaveProperty('get', expect.any(Function))
      expect(derived).toHaveProperty('subscribe', expect.any(Function))
      expect(derived).not.toHaveProperty('set')
    })

    it('can be used as source for another computed', () => {
      const source = createStore({ a: 1, b: 2 })
      const sum = createComputed(source, s => s.a + s.b)
      const squared = createComputed(sum, n => n * n)
      expect(squared.get()).toBe(9)
      source.set({ a: 2, b: 2 })
      expect(squared.get()).toBe(16)
    })
  })
})
