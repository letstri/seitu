import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMediaQuery } from './index'

interface MQL {
  matches: boolean
  media: string
  addEventListener: (event: string, cb: (event: Event) => void) => void
  removeEventListener: (event: string, cb: (event: Event) => void) => void
  dispatchEvent: (event: Event) => boolean
}

describe('createMediaQuery', () => {
  let mql: MQL
  let changeListener: ((event: Event) => void) | null

  beforeEach(() => {
    changeListener = null
    mql = {
      matches: true,
      media: '(min-width: 768px)',
      addEventListener: vi.fn((_event: string, cb: (event: Event) => void) => {
        changeListener = cb
      }),
      removeEventListener: vi.fn(
        (_event: string, _cb: (event: Event) => void) => {
          changeListener = null
        }
      ),
      dispatchEvent: vi.fn((event: Event) => {
        changeListener?.(event)
        return true
      }),
    }
    window.matchMedia = vi.fn().mockReturnValue(mql)
  })

  describe('get', () => {
    it('returns matchMedia().matches when window is defined', () => {
      const query = createMediaQuery({ query: '(min-width: 768px)' })
      expect(query.get()).toBe(true)

      mql.matches = false
      expect(query.get()).toBe(false)
    })

    it('returns defaultMatches when window is undefined (SSR)', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const query = createMediaQuery({
          query: '(min-width: 768px)',
          defaultMatches: true,
        })
        expect(query.get()).toBe(true)
      } finally {
        vi.stubGlobal('window', originalWindow)
      }
    })

    it('returns false when window is undefined and defaultMatches is not set', () => {
      const originalWindow = globalThis.window
      vi.stubGlobal('window', undefined)

      try {
        const query = createMediaQuery({ query: '(min-width: 768px)' })
        expect(query.get()).toBe(false)
      } finally {
        vi.stubGlobal('window', originalWindow)
      }
    })
  })

  describe('subscribe', () => {
    it('calls callback when media query change fires and returns unsubscribe', () => {
      const query = createMediaQuery({ query: '(min-width: 768px)' })
      const callback = vi.fn()
      query.subscribe(callback)

      mql.dispatchEvent(new Event('change'))
      expect(callback).toHaveBeenCalledOnce()
      expect(callback).toHaveBeenLastCalledWith(true)

      mql.matches = false
      mql.dispatchEvent(new Event('change'))

      expect(callback).toHaveBeenCalledTimes(2)
      expect(callback).toHaveBeenLastCalledWith(false)
    })

    it('stops calling callback after unsubscribe', () => {
      const query = createMediaQuery({ query: '(min-width: 768px)' })
      const callback = vi.fn()
      const unsubscribe = query.subscribe(callback)

      mql.dispatchEvent(new Event('change'))
      expect(callback).toHaveBeenCalledOnce()

      unsubscribe()
      mql.matches = false
      mql.dispatchEvent(new Event('change'))

      expect(callback).toHaveBeenCalledOnce()
    })

    it('passes the given query string to matchMedia', () => {
      const queryString = '(prefers-color-scheme: dark)'
      createMediaQuery({ query: queryString }).get()

      expect(window.matchMedia).toHaveBeenCalledWith(queryString)
    })
  })
})

describe('createMediaQuery typing and server snapshot', () => {
  it('accepts level 4 range syntax and spaced ratios at the type level', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    createMediaQuery({ query: '(width >= 768px)' })
    createMediaQuery({ query: '(768px <= width <= 1024px)' })
    createMediaQuery({ query: '(aspect-ratio: 16 / 9)' })
    createMediaQuery({ query: 'screen and (min-width: 768px), print' })
    // @ts-expect-error incomplete query is rejected
    createMediaQuery({ query: '(min-width: ' })
    const dynamic: string = '(min-width: 1px)'
    createMediaQuery({ query: dynamic })

    window.matchMedia = originalMatchMedia
  })

  it('uses defaultMatches as the server snapshot', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const mq = createMediaQuery({
      query: '(min-width: 768px)',
      defaultMatches: true,
    })
    expect(mq.get()).toBe(true)
    expect(mq.getServer()).toBe(true)

    const mqDefault = createMediaQuery({ query: '(min-width: 768px)' })
    expect(mqDefault.getServer()).toBe(false)

    window.matchMedia = originalMatchMedia
  })
})
