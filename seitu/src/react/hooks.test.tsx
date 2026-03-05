import type { SessionStorage } from '../web/session-storage'
import type { SessionStorageValue } from '../web/session-storage-value'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { mediaQuery } from '../web/media-query'
import { createSessionStorage } from '../web/session-storage'
import { sessionStorageValue } from '../web/session-storage-value'
import { useSubscription } from './hooks'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const TEST_KEY = 'seitu-hooks-test-key'

function TestComponent({ storage }: { storage: SessionStorageValue<number> }) {
  const value = useSubscription(() => storage)
  return <span data-testid="subscription-value">{value}</span>
}

function TestComponentWithSelector({ storage }: { storage: SessionStorage<{ count: number }> }) {
  const value = useSubscription(() => storage, value => value.count)
  return <span data-testid="subscription-value">{value}</span>
}

describe('hooks', () => {
  describe('useSubscription no selector', () => {
    it('should return the value', () => {
      const subscription = {
        'get': () => 1,
        'subscribe': () => () => {},
        '~': {
          notify: () => {},
          output: null as unknown as number,
        },
      }
      const { result } = renderHook(() => useSubscription(() => subscription))
      expect(result.current).toBe(1)
    })

    it('should update when session storage value changes', () => {
      const storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })

      render(<TestComponent storage={storage} />)
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')

      act(() => {
        storage.set(42)
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('42')
    })
  })

  describe('useSubscription with selector', () => {
    it('should update when selector changes', () => {
      const storage = createSessionStorage({ schemas: { count: z.number() }, defaultValues: { count: 0 } })

      render(<TestComponentWithSelector storage={storage} />)
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')

      act(() => {
        storage.set({ count: 42 })
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('42')
    })

    it('should not re-render when value is the same', () => {
      const storage = createSessionStorage({ schemas: { count: z.number() }, defaultValues: { count: 0 } })
      let renderCount = 0

      function TestWithRenderCount({ storage: s }: { storage: SessionStorage<{ count: number }> }) {
        renderCount++
        const value = useSubscription(() => s, value => value.count)
        return <span data-testid="subscription-value">{value}</span>
      }

      render(<TestWithRenderCount storage={storage} />)
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')
      expect(renderCount).toBe(1)

      act(() => {
        storage.set({ count: 1 })
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('1')
      expect(renderCount).toBe(2)

      act(() => {
        storage.set({ count: 1 })
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('1')
      expect(renderCount).toBe(2)
    })
  })

  describe('useSubscription factory', () => {
    it('should call factory only once across re-renders', () => {
      const factory = vi.fn(() =>
        sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 }),
      )

      const { result, rerender } = renderHook(() => useSubscription(factory))
      expect(factory).toHaveBeenCalledTimes(1)
      expect(result.current).toBe(0)

      rerender()
      rerender()
      expect(factory).toHaveBeenCalledTimes(1)
    })

    it('should update when subscription created by factory changes', () => {
      let storage: SessionStorageValue<number> | undefined

      function TestFactory() {
        const value = useSubscription(() => {
          storage = sessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
          return storage
        })
        return <span data-testid="subscription-value">{value}</span>
      }

      render(<TestFactory />)
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')

      act(() => {
        storage!.set(99)
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('99')
    })

    it('should not re-render when factory value is deeply equal', () => {
      let renderCount = 0

      const storage = createSessionStorage({
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })

      function TestFactoryRenderCount() {
        renderCount++
        const value = useSubscription(
          () => storage,
          v => v.count,
        )
        return <span data-testid="subscription-value">{value}</span>
      }

      const { unmount } = render(<TestFactoryRenderCount />)
      expect(renderCount).toBe(1)
      act(() => {
        storage.set({ count: 1, name: 'test' })
      })
      expect(renderCount).toBe(2)
      act(() => {
        storage.set({ count: 1, name: 'new test' })
      })
      expect(renderCount).toBe(2)
      unmount()
    })
  })
})

describe('mediaQuery', () => {
  it('should return the matches value for light and dark', () => {
    const originalMatchMedia = window.matchMedia
    let listener: ((event: Event) => void) | null = null

    const mql = {
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn((_event: string, cb: (event: Event) => void) => {
        listener = cb
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event: Event) => {
        listener?.(event)
        return true
      }),
    }

    window.matchMedia = vi.fn().mockReturnValue(mql)

    const { result } = renderHook(() => useSubscription(() => mediaQuery({ query: '(prefers-color-scheme: dark)' })))
    expect(result.current).toBe(true)

    act(() => {
      mql.matches = false
      listener?.(new Event('change'))
    })

    expect(result.current).toBe(false)

    window.matchMedia = originalMatchMedia
  })
})
