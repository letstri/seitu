import { describe, expect, it, vi } from 'vitest'
import { createComputed } from './computed'
import { createStore } from './store'

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

  describe('multiple sources', () => {
    it('derives from an array of sources', () => {
      const a = createStore(1)
      const b = createStore(2)
      const sum = createComputed([a, b], ([a, b]) => a + b)
      expect(sum.get()).toBe(3)
    })

    it('updates when any source changes', () => {
      const a = createStore(1)
      const b = createStore(10)
      const combined = createComputed([a, b], ([a, b]) => a + b)
      a.set(2)
      expect(combined.get()).toBe(12)
      b.set(20)
      expect(combined.get()).toBe(22)
    })

    it('notifies subscribers when any source changes', () => {
      const a = createStore(1)
      const b = createStore(2)
      const sum = createComputed([a, b], ([a, b]) => a + b)
      const callback = vi.fn()
      sum.subscribe(callback)
      a.set(5)
      expect(callback).toHaveBeenLastCalledWith(7)
      b.set(10)
      expect(callback).toHaveBeenLastCalledWith(15)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('works with mixed source types', () => {
      const name = createStore('alice')
      const age = createStore(30)
      const label = createComputed(
        [name, age],
        ([n, a]) => `${n} is ${a}`,
      )
      expect(label.get()).toBe('alice is 30')
      name.set('bob')
      expect(label.get()).toBe('bob is 30')
    })

    it('can chain from another computed', () => {
      const a = createStore(2)
      const b = createStore(3)
      const sum = createComputed([a, b], ([a, b]) => a + b)
      const doubled = createComputed(sum, n => n * 2)
      expect(doubled.get()).toBe(10)
      a.set(5)
      expect(doubled.get()).toBe(16)
    })
  })
})
