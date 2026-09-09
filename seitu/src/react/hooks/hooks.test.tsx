import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'

import { createStore } from '../../core/store'
import { createSubscription } from '../../core/subscription'
import { createMediaQuery } from '../../web/media-query'
import { createScrollState } from '../../web/scroll-state'
import type { WebStorage } from '../../web/web-storage'
import { createWebStorage } from '../../web/web-storage'
import type { WebStorageValue } from '../../web/web-storage-value'
import { createWebStorageValue } from '../../web/web-storage-value'
import { useSubscription } from './index'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const TEST_KEY = 'seitu-hooks-test-key'

function TestComponent({ storage }: { storage: WebStorageValue<number> }) {
  const renderCount = React.useRef(1).current++
  const value = useSubscription(storage)
  return (
    <span data-testid="subscription-value" data-render-count={renderCount}>
      {value}
    </span>
  )
}

function TestComponentWithSelector({
  storage,
}: {
  storage: WebStorage<{ count: number }>
}) {
  const renderCount = React.useRef(1).current++
  const value = useSubscription(storage, { selector: (value) => value.count })
  return (
    <span data-testid="subscription-value" data-render-count={renderCount}>
      {value}
    </span>
  )
}

describe('hooks', () => {
  describe('useSubscription no selector', () => {
    it('should return the value', () => {
      const subscription = {
        get: () => 1,
        subscribe: () => () => {},
        '~': {
          notify: () => {},
          output: null as unknown as number,
        },
      }
      const { result } = renderHook(() => useSubscription(() => subscription))
      expect(result.current).toBe(1)
    })

    it('should update when session storage value changes', () => {
      const storage = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })

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
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })

      render(<TestComponentWithSelector storage={storage} />)
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')

      act(() => {
        storage.set({ count: 42 })
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('42')
    })

    it('should not re-render when value is the same', () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      let renderCount = 0

      function TestWithRenderCount({
        storage: s,
      }: {
        storage: WebStorage<{ count: number }>
      }) {
        renderCount++
        const value = useSubscription(() => s, {
          selector: (value) => value.count,
        })
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
      const storage = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })

      const { result } = renderHook(() => useSubscription(storage))
      expect(result.current).toBe(0)
    })
  })

  describe('useSubscription factory', () => {
    it('should call factory only once across re-renders', () => {
      const factory = vi.fn(() =>
        createWebStorageValue({
          type: 'sessionStorage',
          schema: z.number(),
          key: TEST_KEY,
          defaultValue: 0,
        })
      )

      const { result, rerender } = renderHook(() => useSubscription(factory))
      expect(factory).toHaveBeenCalledOnce()
      expect(result.current).toBe(0)

      rerender()
      rerender()
      expect(factory).toHaveBeenCalledOnce()
    })

    it('should update when subscription created by factory changes', () => {
      let storage: WebStorageValue<number> | undefined

      function TestFactory() {
        const value = useSubscription(() => {
          storage = createWebStorageValue({
            type: 'sessionStorage',
            schema: z.number(),
            key: TEST_KEY,
            defaultValue: 0,
          })
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

      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: {
          count: z.number(),
          name: z.string(),
        },
        defaultValues: { count: 0, name: '' },
      })

      function TestFactoryRenderCount() {
        renderCount++
        const value = useSubscription(storage, { selector: (v) => v.count })
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
        createWebStorageValue({
          type: 'sessionStorage',
          schema: z.number(),
          key,
          defaultValue: 0,
        })
      )

      const { result, rerender } = renderHook(
        ({ key }) => useSubscription(() => factory(key), { deps: [key] }),
        { initialProps: { key: 'key-a' } }
      )
      expect(factory).toHaveBeenCalledOnce()
      expect(result.current).toBe(0)

      rerender({ key: 'key-a' })
      expect(factory).toHaveBeenCalledOnce()

      rerender({ key: 'key-b' })
      expect(factory).toHaveBeenCalledTimes(2)
    })
  })

  describe('useSubscription with changing source object', () => {
    it('should pick up a new subscription when source object changes', () => {
      const storageA = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: `${TEST_KEY}-a`,
        defaultValue: 1,
      })
      const storageB = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: `${TEST_KEY}-b`,
        defaultValue: 2,
      })

      const { result, rerender } = renderHook(
        ({ storage }) => useSubscription(storage),
        { initialProps: { storage: storageA } }
      )
      expect(result.current).toBe(1)

      rerender({ storage: storageB })
      expect(result.current).toBe(2)
    })

    it('should subscribe to the new source after switching', () => {
      const storageA = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: `${TEST_KEY}-a`,
        defaultValue: 0,
      })
      const storageB = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: `${TEST_KEY}-b`,
        defaultValue: 10,
      })

      const { result, rerender } = renderHook(
        ({ storage }) => useSubscription(storage),
        { initialProps: { storage: storageA as WebStorageValue<number> } }
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
      const storageA = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: `${TEST_KEY}-a`,
        defaultValue: 0,
      })
      const storageB = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: `${TEST_KEY}-b`,
        defaultValue: 10,
      })

      let renderCount = 0
      const { result, rerender } = renderHook(
        ({ storage }) => {
          renderCount++
          return useSubscription(storage)
        },
        { initialProps: { storage: storageA as WebStorageValue<number> } }
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

  describe('useSubscription with custom isEqual', () => {
    it('should use custom comparator instead of deepEqual', () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })
      let renderCount = 0

      function TestCustomIsEqual() {
        renderCount++
        const value = useSubscription(storage, {
          isEqual: (a, b) => a.count === b.count,
        })
        return <span data-testid="subscription-value">{value.name}</span>
      }

      render(<TestCustomIsEqual />)
      expect(renderCount).toBe(1)
      expect(screen.getByTestId('subscription-value').textContent).toBe('')

      act(() => {
        storage.set({ count: 0, name: 'changed' })
      })
      expect(renderCount).toBe(1)
      expect(screen.getByTestId('subscription-value').textContent).toBe('')

      act(() => {
        storage.set({ count: 1, name: 'changed' })
      })
      expect(renderCount).toBe(2)
      expect(screen.getByTestId('subscription-value').textContent).toBe(
        'changed'
      )
    })

    it('should use Object.is when passed as comparator', () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })
      let renderCount = 0

      function TestObjectIs() {
        renderCount++
        const value = useSubscription(storage, {
          selector: (v) => v.count,
          isEqual: Object.is,
        })
        return <span data-testid="subscription-value">{value}</span>
      }

      render(<TestObjectIs />)
      expect(renderCount).toBe(1)

      act(() => {
        storage.set({ count: 1 })
      })
      expect(renderCount).toBe(2)

      act(() => {
        storage.set({ count: 1 })
      })
      expect(renderCount).toBe(2)
    })
  })

  describe('useSubscription selector changes', () => {
    it('should update when selector changes', () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 5, name: 'hello' },
      })

      const { result, rerender } = renderHook(
        ({ sel }) => useSubscription(storage, { selector: sel }),
        {
          initialProps: {
            sel: (v: { count: number; name: string }) =>
              v.count as number | string,
          },
        }
      )
      expect(result.current).toBe(5)

      rerender({ sel: (v: { count: number; name: string }) => v.name })
      expect(result.current).toBe('hello')
    })

    it('should recompute when selector changes even if values are deeply equal', () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { a: z.number(), b: z.number() },
        defaultValues: { a: 42, b: 42 },
      })

      const { result, rerender } = renderHook(
        ({ sel }) => useSubscription(storage, { selector: sel }),
        { initialProps: { sel: (v: { a: number; b: number }) => v.a } }
      )
      expect(result.current).toBe(42)

      rerender({ sel: (v: { a: number; b: number }) => v.b })
      expect(result.current).toBe(42)
    })
  })

  describe('useSubscription cleanup', () => {
    it('should unsubscribe factory-created subscription on unmount', () => {
      const unsubscribe = vi.fn()
      const subscribe = vi.fn(() => unsubscribe)
      const sub = {
        get: () => 1,
        subscribe,
        '~': { notify: () => {}, output: null as unknown as number },
      }

      const { unmount } = renderHook(() => useSubscription(() => sub))
      expect(subscribe).toHaveBeenCalledOnce()
      expect(unsubscribe).not.toHaveBeenCalled()

      unmount()
      expect(unsubscribe).toHaveBeenCalledOnce()
    })

    it('should unsubscribe old subscription when deps change in factory mode', () => {
      const unsubscribeA = vi.fn()
      const unsubscribeB = vi.fn()
      const subscribeA = vi.fn(() => unsubscribeA)
      const subscribeB = vi.fn(() => unsubscribeB)
      const subA = {
        get: () => 1,
        subscribe: subscribeA,
        '~': { notify: () => {}, output: null as unknown as number },
      }
      const subB = {
        get: () => 2,
        subscribe: subscribeB,
        '~': { notify: () => {}, output: null as unknown as number },
      }

      const { rerender, unmount } = renderHook(
        ({ key }) =>
          useSubscription(() => (key === 'a' ? subA : subB), { deps: [key] }),
        { initialProps: { key: 'a' } }
      )
      expect(subscribeA).toHaveBeenCalledOnce()
      expect(unsubscribeA).not.toHaveBeenCalled()

      rerender({ key: 'b' })
      expect(unsubscribeA).toHaveBeenCalledOnce()
      expect(subscribeB).toHaveBeenCalledOnce()
      expect(unsubscribeB).not.toHaveBeenCalled()

      unmount()
      expect(unsubscribeB).toHaveBeenCalledOnce()
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

    const { result } = renderHook(() =>
      useSubscription(() =>
        createMediaQuery({ query: '(prefers-color-scheme: dark)' })
      )
    )
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
      createScrollState({ element: el, direction: 'vertical' })
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

describe('useSubscription with class-based subscribable', () => {
  it('keeps `this` bound when subscribe is a class method', () => {
    class ClassStore {
      private value = 1
      private subscribers = new Set<() => void>()

      '~' = {
        notify: () => this.subscribers.forEach((cb) => cb()),
        output: null as unknown as number,
      }

      get() {
        return this.value
      }

      subscribe(callback: (value: number) => any) {
        const cb = () => callback(this.value)
        this.subscribers.add(cb)
        return () => {
          this.subscribers.delete(cb)
        }
      }

      set(value: number) {
        this.value = value
        this['~'].notify()
      }
    }

    const store = new ClassStore()
    const { result } = renderHook(() => useSubscription(store))

    expect(result.current).toBe(1)

    act(() => store.set(2))
    expect(result.current).toBe(2)
  })
})

describe('useSubscription hydration', () => {
  it('hydrates with the server snapshot, then switches to the persisted value', async () => {
    const { hydrateRoot } = await import('react-dom/client')
    window.localStorage.setItem('hydrate-count', '5')
    const value = createWebStorageValue({
      type: 'localStorage',
      key: 'hydrate-count',
      schema: z.number(),
      defaultValue: 0,
    })

    function App() {
      const v = useSubscription(value)
      return <span data-testid="hydrated">{v}</span>
    }

    // Server markup; `get()` is the default.
    const container = document.createElement('div')
    container.innerHTML = '<span data-testid="hydrated">0</span>'
    document.body.append(container)

    const errors: unknown[] = []
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <App />, {
        onRecoverableError: (e) => errors.push(e),
      })
    })

    expect(errors).toEqual([])
    expect(
      container.querySelector('[data-testid="hydrated"]')!.textContent
    ).toBe('5')

    await act(async () => root?.unmount())
    container.remove()
    window.localStorage.removeItem('hydrate-count')
  })

  it('applies the selector to the server snapshot', () => {
    const storage = createWebStorage({
      type: 'localStorage',
      schemas: { count: z.number(), name: z.string() },
      defaultValues: { count: 1, name: 'ssr' },
    })
    storage.set({ count: 2, name: 'client' })

    const { result } = renderHook(() =>
      useSubscription(storage, { selector: (s) => s.name })
    )
    expect(result.current).toBe('client')
    expect(storage.getServer().name).toBe('ssr')
  })
})

describe('useSubscription snapshot fast path', () => {
  it('runs a stable selector once per render cycle and once per notification', () => {
    const store = createStore({ count: 1, other: 'a' })
    const selector = vi.fn((s: { count: number; other: string }) => s.count)

    const { result, rerender } = renderHook(() =>
      useSubscription(store, { selector })
    )
    expect(result.current).toBe(1)
    const afterMount = selector.mock.calls.length
    expect(afterMount).toBeLessThanOrEqual(2)

    rerender()
    rerender()
    expect(selector.mock.calls).toHaveLength(afterMount)

    act(() => store.set((s) => ({ ...s, count: 2 })))
    expect(result.current).toBe(2)
    expect(selector.mock.calls.length).toBeLessThanOrEqual(afterMount + 2)
  })

  it('recomputes when an inline selector depends on props', () => {
    const store = createStore({ items: ['a', 'b', 'c'] })

    const { result, rerender } = renderHook(
      ({ index }: { index: number }) =>
        useSubscription(store, { selector: (s) => s.items[index] }),
      { initialProps: { index: 0 } }
    )
    expect(result.current).toBe('a')

    rerender({ index: 2 })
    expect(result.current).toBe('c')
  })

  it('recomputes after a notification even when the source keeps the same reference', () => {
    const state = { count: 1 }
    const { subscribe, notify } = createSubscription()
    const mutable = {
      get: () => state,
      subscribe: (
        cb: (value: typeof state) => any,
        opts?: { immediate?: boolean }
      ) => subscribe(() => cb(state), opts),
      '~': { output: state, notify },
    }

    const { result } = renderHook(() =>
      useSubscription(mutable, { selector: (s) => s.count })
    )
    expect(result.current).toBe(1)

    act(() => {
      state.count = 2
      notify()
    })
    expect(result.current).toBe(2)
  })

  it('keeps snapshot identity when the selector returns an equal object', () => {
    const store = createStore({ a: 1, b: 2 })
    const { result, rerender } = renderHook(() =>
      useSubscription(store, { selector: (s) => ({ a: s.a }) })
    )
    const first = result.current

    rerender()
    expect(result.current).toBe(first)

    act(() => store.set((s) => ({ ...s, b: 3 })))
    expect(result.current).toBe(first)

    act(() => store.set((s) => ({ ...s, a: 9 })))
    expect(result.current).toEqual({ a: 9 })
  })
  describe('useSubscription with element from callback ref', () => {
    function scrollTo(el: HTMLElement, top: number) {
      Object.defineProperty(el, 'scrollTop', { value: top, configurable: true })
      Object.defineProperty(el, 'scrollHeight', {
        value: 1000,
        configurable: true,
      })
      Object.defineProperty(el, 'clientHeight', {
        value: 100,
        configurable: true,
      })
      el.dispatchEvent(new Event('scroll'))
    }

    function ScrollBox({ show }: { show: boolean }) {
      const [el, setEl] = React.useState<HTMLDivElement | null>(null)
      const state = useSubscription(
        () => createScrollState({ element: el, direction: 'vertical' }),
        { deps: [el] }
      )
      return (
        <>
          <span data-testid="top">{String(state.top.reached)}</span>
          {show && <div ref={setEl} data-testid="box" />}
        </>
      )
    }

    it('tracks an element that mounts late and remounts', () => {
      const { rerender } = render(<ScrollBox show={false} />)
      expect(screen.getByTestId('top').textContent).toBe('false')

      rerender(<ScrollBox show />)
      expect(screen.getByTestId('top').textContent).toBe('true')
      act(() => scrollTo(screen.getByTestId('box'), 50))
      expect(screen.getByTestId('top').textContent).toBe('false')

      rerender(<ScrollBox show={false} />)
      rerender(<ScrollBox show />)
      expect(screen.getByTestId('top').textContent).toBe('true')
      act(() => scrollTo(screen.getByTestId('box'), 50))
      expect(screen.getByTestId('top').textContent).toBe('false')
      act(() => scrollTo(screen.getByTestId('box'), 0))
      expect(screen.getByTestId('top').textContent).toBe('true')
    })
  })
})
