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
})
