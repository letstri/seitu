import type { SessionStorage } from '../web/session-storage'
import type { SessionStorageValue } from '../web/session-storage-value'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createMediaQuery } from '../web/media-query'
import { createScrollState } from '../web/scroll-state'
import { createSessionStorage } from '../web/session-storage'
import { createSessionStorageValue } from '../web/session-storage-value'
import { useSubscription } from './hooks'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const TEST_KEY = 'seitu-hooks-test-key'

function TestComponent({ storage }: { storage: SessionStorageValue<number> }) {
  const value = useSubscription(storage)
  return <span data-testid="subscription-value">{value}</span>
}

function TestComponentWithSelector({ storage }: { storage: SessionStorage<{ count: number }> }) {
  const value = useSubscription(storage, { selector: value => value.count })
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
      const storage = createSessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })

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
        const value = useSubscription(() => s, { selector: value => value.count })
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

  describe('useSubscription with direct object', () => {
    it('should accept a stable subscription object', () => {
      const storage = createSessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })

      const { result } = renderHook(() => useSubscription(storage))
      expect(result.current).toBe(0)
    })
  })

  describe('useSubscription factory', () => {
    it('should call factory only once across re-renders', () => {
      const factory = vi.fn(() =>
        createSessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 }),
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
          storage = createSessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
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
        const value = useSubscription(storage, { selector: v => v.count })
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

    it('should recreate subscription when deps change', () => {
      const factory = vi.fn((key: string) =>
        createSessionStorageValue({ schema: z.number(), key, defaultValue: 0 }),
      )

      const { result, rerender } = renderHook(
        ({ key }) => useSubscription(() => factory(key), { deps: [key] }),
        { initialProps: { key: 'key-a' } },
      )
      expect(factory).toHaveBeenCalledTimes(1)
      expect(result.current).toBe(0)

      rerender({ key: 'key-a' })
      expect(factory).toHaveBeenCalledTimes(1)

      rerender({ key: 'key-b' })
      expect(factory).toHaveBeenCalledTimes(2)
    })
  })

  describe('useSubscription with changing source object', () => {
    it('should pick up a new subscription when source object changes', () => {
      const storageA = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-a`, defaultValue: 1 })
      const storageB = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-b`, defaultValue: 2 })

      const { result, rerender } = renderHook(
        ({ storage }) => useSubscription(storage),
        { initialProps: { storage: storageA } },
      )
      expect(result.current).toBe(1)

      rerender({ storage: storageB })
      expect(result.current).toBe(2)
    })

    it('should subscribe to the new source after switching', () => {
      const storageA = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-a`, defaultValue: 0 })
      const storageB = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-b`, defaultValue: 10 })

      const { result, rerender } = renderHook(
        ({ storage }) => useSubscription(storage),
        { initialProps: { storage: storageA as SessionStorageValue<number> } },
      )
      expect(result.current).toBe(0)

      rerender({ storage: storageB })
      expect(result.current).toBe(10)

      act(() => {
        storageB.set(20)
      })
      expect(result.current).toBe(20)
    })

    it('should not react to old source after switching', () => {
      const storageA = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-a`, defaultValue: 0 })
      const storageB = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-b`, defaultValue: 10 })

      let renderCount = 0
      const { result, rerender } = renderHook(
        ({ storage }) => {
          renderCount++
          return useSubscription(storage)
        },
        { initialProps: { storage: storageA as SessionStorageValue<number> } },
      )
      expect(result.current).toBe(0)

      rerender({ storage: storageB })
      const countAfterSwitch = renderCount

      act(() => {
        storageA.set(99)
      })
      expect(renderCount).toBe(countAfterSwitch)
      expect(result.current).toBe(10)
    })
  })

  describe('useSubscription selector changes', () => {
    it('should update when selector changes', () => {
      const storage = createSessionStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 5, name: 'hello' },
      })

      const { result, rerender } = renderHook(
        ({ sel }) => useSubscription(storage, { selector: sel }),
        { initialProps: { sel: (v: { count: number, name: string }) => v.count as number | string } },
      )
      expect(result.current).toBe(5)

      rerender({ sel: (v: { count: number, name: string }) => v.name })
      expect(result.current).toBe('hello')
    })

    it('should recompute when selector changes even if values are deeply equal', () => {
      const storage = createSessionStorage({
        schemas: { a: z.number(), b: z.number() },
        defaultValues: { a: 42, b: 42 },
      })

      const { result, rerender } = renderHook(
        ({ sel }) => useSubscription(storage, { selector: sel }),
        { initialProps: { sel: (v: { a: number, b: number }) => v.a } },
      )
      expect(result.current).toBe(42)

      rerender({ sel: (v: { a: number, b: number }) => v.b })
      expect(result.current).toBe(42)
    })
  })

  describe('useSubscription cleanup', () => {
    it('should unsubscribe factory-created subscription on unmount', () => {
      const unsubscribe = vi.fn()
      const subscribe = vi.fn(() => unsubscribe)
      const sub = {
        'get': () => 1,
        'subscribe': subscribe,
        '~': { notify: () => {}, output: null as unknown as number },
      }

      const { unmount } = renderHook(() => useSubscription(() => sub))
      expect(subscribe).toHaveBeenCalledTimes(1)
      expect(unsubscribe).not.toHaveBeenCalled()

      unmount()
      expect(unsubscribe).toHaveBeenCalledTimes(1)
    })

    it('should unsubscribe old subscription when deps change in factory mode', () => {
      const unsubscribeA = vi.fn()
      const unsubscribeB = vi.fn()
      const subscribeA = vi.fn(() => unsubscribeA)
      const subscribeB = vi.fn(() => unsubscribeB)
      const subA = {
        'get': () => 1,
        'subscribe': subscribeA,
        '~': { notify: () => {}, output: null as unknown as number },
      }
      const subB = {
        'get': () => 2,
        'subscribe': subscribeB,
        '~': { notify: () => {}, output: null as unknown as number },
      }

      const { rerender, unmount } = renderHook(
        ({ key }) => useSubscription(() => key === 'a' ? subA : subB, { deps: [key] }),
        { initialProps: { key: 'a' } },
      )
      expect(subscribeA).toHaveBeenCalledTimes(1)
      expect(unsubscribeA).not.toHaveBeenCalled()

      rerender({ key: 'b' })
      expect(unsubscribeA).toHaveBeenCalledTimes(1)
      expect(subscribeB).toHaveBeenCalledTimes(1)
      expect(unsubscribeB).not.toHaveBeenCalled()

      unmount()
      expect(unsubscribeB).toHaveBeenCalledTimes(1)
    })
  })
})

describe('createMediaQuery', () => {
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

    const { result } = renderHook(() => useSubscription(() => createMediaQuery({ query: '(prefers-color-scheme: dark)' })))
    expect(result.current).toBe(true)

    act(() => {
      mql.matches = false
      listener?.(new Event('change'))
    })

    expect(result.current).toBe(false)

    window.matchMedia = originalMatchMedia
  })
})

describe('createScrollState', () => {
  it('should recreate subscription when element ref changes via callback ref', () => {
    const factory = vi.fn((el: HTMLDivElement | null) =>
      createScrollState({ element: el, direction: 'vertical' }),
    )

    function TestWithScrollState() {
      const [ref, setRef] = React.useState<HTMLDivElement | null>(null)
      const state = useSubscription(() => factory(ref), { deps: [ref] })
      return (
        <div ref={setRef} data-testid="scroll-value">
          {String(state.top.reached)}
        </div>
      )
    }

    render(<TestWithScrollState />)

    expect(factory).toHaveBeenCalledTimes(2)
    expect(factory).toHaveBeenNthCalledWith(1, null)
    expect(factory).toHaveBeenNthCalledWith(2, expect.any(HTMLDivElement))
    expect(screen.getByTestId('scroll-value').textContent).toBe('true')
  })
})
