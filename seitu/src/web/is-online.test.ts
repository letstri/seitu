import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createIsOnline } from './is-online'

describe('createIsOnline', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('returns navigator.onLine when navigator is defined', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      const state = createIsOnline()
      expect(state.get()).toBe(true)

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      expect(state.get()).toBe(false)
    })

    it('returns defaultOnline when navigator is undefined (SSR)', () => {
      const originalNavigator = globalThis.navigator
      vi.stubGlobal('navigator', undefined)

      try {
        const state = createIsOnline()
        expect(state.get()).toBe(true)
      }
      finally {
        vi.stubGlobal('navigator', originalNavigator)
      }
    })

    it('returns true in SSR', () => {
      const originalNavigator = globalThis.navigator
      vi.stubGlobal('navigator', undefined)

      try {
        const state = createIsOnline()
        expect(state.get()).toBe(true)
      }
      finally {
        vi.stubGlobal('navigator', originalNavigator)
      }
    })
  })

  describe('subscribe', () => {
    it('notifies subscribers on offline and online events', () => {
      const state = createIsOnline()
      const callback = vi.fn()
      state.subscribe(callback)

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      window.dispatchEvent(new Event('offline'))
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenLastCalledWith(false)

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      window.dispatchEvent(new Event('online'))
      expect(callback).toHaveBeenCalledTimes(2)
      expect(callback).toHaveBeenLastCalledWith(true)
    })

    it('stops notifying after unsubscribe', () => {
      const state = createIsOnline()
      const callback = vi.fn()
      const unsubscribe = state.subscribe(callback)

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      window.dispatchEvent(new Event('offline'))
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      window.dispatchEvent(new Event('online'))
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
