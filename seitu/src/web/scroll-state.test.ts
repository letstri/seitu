import { describe, expect, it, vi } from 'vitest'
import { scrollState } from './scroll-state'

function createMockElement(overrides: Partial<Element> = {}): Element {
  const el = document.createElement('div')

  Object.defineProperty(el, 'scrollTop', { value: 0, writable: true, configurable: true })
  Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true, configurable: true })
  Object.defineProperty(el, 'scrollHeight', { value: 500, writable: true, configurable: true })
  Object.defineProperty(el, 'scrollWidth', { value: 500, writable: true, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: 200, writable: true, configurable: true })
  Object.defineProperty(el, 'clientWidth', { value: 200, writable: true, configurable: true })

  for (const [key, value] of Object.entries(overrides)) {
    Object.defineProperty(el, key, { value, writable: true, configurable: true })
  }

  return el
}

function setScrollPosition(el: Element, props: { scrollTop?: number, scrollLeft?: number }) {
  if (props.scrollTop !== undefined) {
    Object.defineProperty(el, 'scrollTop', { value: props.scrollTop, writable: true, configurable: true })
  }
  if (props.scrollLeft !== undefined) {
    Object.defineProperty(el, 'scrollLeft', { value: props.scrollLeft, writable: true, configurable: true })
  }
}

const inactive = { value: false, remaining: 0 }

describe('scrollState', () => {
  describe('get', () => {
    it('returns all inactive when element is null', () => {
      const scroll = scrollState({ element: null })
      expect(scroll.get()).toEqual({ top: inactive, bottom: inactive, left: inactive, right: inactive })
    })

    it('returns correct remaining distances at initial position', () => {
      const el = createMockElement({ scrollHeight: 500, clientHeight: 200, scrollWidth: 500, clientWidth: 200 })
      const scroll = scrollState({ element: el })
      const state = scroll.get()

      expect(state.top).toEqual({ value: false, remaining: 0 })
      expect(state.bottom).toEqual({ value: false, remaining: 300 })
      expect(state.left).toEqual({ value: false, remaining: 0 })
      expect(state.right).toEqual({ value: false, remaining: 300 })
    })

    it('returns top.value=true and remaining when scrolled past threshold', () => {
      const el = createMockElement({ scrollHeight: 500, clientHeight: 200 })
      setScrollPosition(el, { scrollTop: 50 })

      const scroll = scrollState({ element: el, threshold: 10 })
      expect(scroll.get().top).toEqual({ value: true, remaining: 50 })
    })

    it('returns top.value=false when scrolled less than threshold', () => {
      const el = createMockElement()
      setScrollPosition(el, { scrollTop: 5 })

      const scroll = scrollState({ element: el, threshold: 10 })
      expect(scroll.get().top.value).toBe(false)
      expect(scroll.get().top.remaining).toBe(5)
    })

    it('returns bottom.value=true when scrolled to the end', () => {
      const el = createMockElement({ scrollHeight: 500, clientHeight: 200 })
      setScrollPosition(el, { scrollTop: 300 })

      const scroll = scrollState({ element: el })
      expect(scroll.get().bottom).toEqual({ value: true, remaining: 0 })
    })

    it('returns bottom.value=true when within threshold of end', () => {
      const el = createMockElement({ scrollHeight: 500, clientHeight: 200 })
      setScrollPosition(el, { scrollTop: 295 })

      const scroll = scrollState({ element: el, threshold: 10 })
      expect(scroll.get().bottom.value).toBe(true)
      expect(scroll.get().bottom.remaining).toBe(5)
    })

    it('returns left.value=true when scrolled horizontally past threshold', () => {
      const el = createMockElement()
      setScrollPosition(el, { scrollLeft: 50 })

      const scroll = scrollState({ element: el, direction: 'horizontal', threshold: 10 })
      expect(scroll.get().left).toEqual({ value: true, remaining: 50 })
    })

    it('returns right.value=true when scrolled to the right end', () => {
      const el = createMockElement({ scrollWidth: 500, clientWidth: 200 })
      setScrollPosition(el, { scrollLeft: 300 })

      const scroll = scrollState({ element: el, direction: 'horizontal' })
      expect(scroll.get().right).toEqual({ value: true, remaining: 0 })
    })

    it('tracks only vertical when direction is vertical', () => {
      const el = createMockElement()
      setScrollPosition(el, { scrollTop: 50, scrollLeft: 50 })

      const scroll = scrollState({ element: el, direction: 'vertical' })
      const state = scroll.get()
      expect(state.top.value).toBe(true)
      expect(state.left).toEqual(inactive)
      expect(state.right).toEqual(inactive)
    })

    it('tracks only horizontal when direction is horizontal', () => {
      const el = createMockElement()
      setScrollPosition(el, { scrollTop: 50, scrollLeft: 50 })

      const scroll = scrollState({ element: el, direction: 'horizontal' })
      const state = scroll.get()
      expect(state.top).toEqual(inactive)
      expect(state.bottom).toEqual(inactive)
      expect(state.left.value).toBe(true)
    })

    it('tracks both axes by default', () => {
      const el = createMockElement()
      setScrollPosition(el, { scrollTop: 50, scrollLeft: 50 })

      const scroll = scrollState({ element: el })
      const state = scroll.get()
      expect(state.top.value).toBe(true)
      expect(state.top.remaining).toBe(50)
      expect(state.left.value).toBe(true)
      expect(state.left.remaining).toBe(50)
    })
  })

  describe('subscribe', () => {
    it('calls callback on scroll event', () => {
      const el = createMockElement()
      const scroll = scrollState({ element: el })
      const callback = vi.fn()

      scroll.subscribe(callback)

      setScrollPosition(el, { scrollTop: 100 })
      el.dispatchEvent(new Event('scroll'))

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        top: { value: true, remaining: 100 },
      }))
    })

    it('stops calling callback after unsubscribe', () => {
      const el = createMockElement()
      const scroll = scrollState({ element: el })
      const callback = vi.fn()

      const unsubscribe = scroll.subscribe(callback)

      el.dispatchEvent(new Event('scroll'))
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      el.dispatchEvent(new Event('scroll'))
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('calls callback once with default state when element is null', () => {
      const scroll = scrollState({ element: null })
      const callback = vi.fn()

      const unsubscribe = scroll.subscribe(callback)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ top: inactive, bottom: inactive, left: inactive, right: inactive })
      expect(unsubscribe).not.toThrow()
    })

    it('supports multiple subscribers', () => {
      const el = createMockElement()
      const scroll = scrollState({ element: el })
      const cb1 = vi.fn()
      const cb2 = vi.fn()

      scroll.subscribe(cb1)
      scroll.subscribe(cb2)

      setScrollPosition(el, { scrollTop: 100 })
      el.dispatchEvent(new Event('scroll'))

      expect(cb1).toHaveBeenCalledTimes(1)
      expect(cb2).toHaveBeenCalledTimes(1)
    })

    it('unsubscribing one does not affect others', () => {
      const el = createMockElement()
      const scroll = scrollState({ element: el })
      const cb1 = vi.fn()
      const cb2 = vi.fn()

      const unsub1 = scroll.subscribe(cb1)
      scroll.subscribe(cb2)

      unsub1()

      el.dispatchEvent(new Event('scroll'))
      expect(cb1).toHaveBeenCalledTimes(0)
      expect(cb2).toHaveBeenCalledTimes(1)
    })
  })
})
