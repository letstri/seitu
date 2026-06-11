import type { WebStorage } from '../web/web-storage'
import type { WebStorageValue } from '../web/web-storage-value'
import { cleanup, render, renderHook, waitFor } from '@solidjs/testing-library'
import { createEffect, createSignal } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'
import { createStore } from '../core/store'
import { createMediaQuery } from '../web/media-query'
import { createWebStorage } from '../web/web-storage'
import { createWebStorageValue } from '../web/web-storage-value'
import { useSubscription } from './hooks'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const TEST_KEY = 'seitu-solid-hooks-test-key'

function TestComponent(props: { storage: WebStorageValue<number> }) {
  const value = useSubscription(() => props.storage)
  return <span data-testid="subscription-value">{value()}</span>
}

function TestComponentWithSelector(props: { storage: WebStorage<{ count: number }> }) {
  const value = useSubscription(() => props.storage, { selector: value => value.count })
  return <span data-testid="subscription-value">{value()}</span>
}

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
    expect(result()).toBe(1)
  })

  it('should update when session storage value changes', async () => {
    const storage = createWebStorageValue({ type: 'sessionStorage', schema: z.number(), key: TEST_KEY, defaultValue: 0 })

    const { getByTestId } = render(() => <TestComponent storage={storage} />)
    expect(getByTestId('subscription-value')).toHaveTextContent('0')

    storage.set(42)
    await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('42'))
  })
})

describe('useSubscription with selector', () => {
  it('should update when selector value changes', async () => {
    const storage = createWebStorage({ type: 'sessionStorage', schemas: { count: z.number() }, defaultValues: { count: 0 } })

    const { getByTestId } = render(() => <TestComponentWithSelector storage={storage} />)
    expect(getByTestId('subscription-value')).toHaveTextContent('0')

    storage.set({ count: 42 })
    await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('42'))
  })

  it('should not update when value is the same', async () => {
    const storage = createWebStorage({ type: 'sessionStorage', schemas: { count: z.number(), name: z.string() }, defaultValues: { count: 0, name: '' } })
    let runs = 0

    function TestWithRunCount() {
      const value = useSubscription(storage, { selector: value => value.count })
      createEffect(() => {
        value()
        runs++
      })
      return <span data-testid="subscription-value">{value()}</span>
    }

    const { getByTestId } = render(() => <TestWithRunCount />)
    expect(getByTestId('subscription-value')).toHaveTextContent('0')
    expect(runs).toBe(1)

    storage.set({ count: 1, name: 'test' })
    await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('1'))
    expect(runs).toBe(2)

    storage.set({ count: 1, name: 'new test' })
    await Promise.resolve()
    expect(getByTestId('subscription-value')).toHaveTextContent('1')
    expect(runs).toBe(2)
  })
})

describe('useSubscription with direct object', () => {
  it('should accept a stable subscription object', () => {
    const storage = createWebStorageValue({ type: 'sessionStorage', schema: z.number(), key: TEST_KEY, defaultValue: 0 })

    const { result } = renderHook(() => useSubscription(storage))
    expect(result()).toBe(0)
  })
})

describe('useSubscription with custom isEqual', () => {
  it('should use custom comparator instead of deepEqual', async () => {
    const storage = createWebStorage({ type: 'sessionStorage', schemas: { count: z.number(), name: z.string() }, defaultValues: { count: 0, name: '' } })
    let runs = 0

    function TestCustomIsEqual() {
      const value = useSubscription(storage, { isEqual: (a, b) => a.count === b.count })
      createEffect(() => {
        value()
        runs++
      })
      return <span data-testid="subscription-value">{value().name}</span>
    }

    const { getByTestId } = render(() => <TestCustomIsEqual />)
    expect(runs).toBe(1)
    expect(getByTestId('subscription-value')).toHaveTextContent('')

    storage.set({ count: 0, name: 'changed' })
    await Promise.resolve()
    expect(runs).toBe(1)
    expect(getByTestId('subscription-value')).toHaveTextContent('')

    storage.set({ count: 1, name: 'changed' })
    await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('changed'))
    expect(runs).toBe(2)
  })

  it('should use Object.is when passed as comparator', async () => {
    const storage = createWebStorage({ type: 'sessionStorage', schemas: { count: z.number() }, defaultValues: { count: 0 } })
    let runs = 0

    function TestObjectIs() {
      const value = useSubscription(storage, { selector: v => v.count, isEqual: Object.is })
      createEffect(() => {
        value()
        runs++
      })
      return <span data-testid="subscription-value">{value()}</span>
    }

    render(() => <TestObjectIs />)
    expect(runs).toBe(1)

    storage.set({ count: 1 })
    await waitFor(() => expect(runs).toBe(2))

    storage.set({ count: 1 })
    await Promise.resolve()
    expect(runs).toBe(2)
  })
})

describe('useSubscription with reactive source', () => {
  it('should pick up a new subscription when the accessor returns a new source', async () => {
    const storageA = createWebStorageValue({ type: 'sessionStorage', schema: z.number(), key: `${TEST_KEY}-a`, defaultValue: 1 })
    const storageB = createWebStorageValue({ type: 'sessionStorage', schema: z.number(), key: `${TEST_KEY}-b`, defaultValue: 2 })

    const [current, setCurrent] = createSignal<WebStorageValue<number>>(storageA)

    function TestReactiveSource() {
      const value = useSubscription(() => current())
      return <span data-testid="subscription-value">{value()}</span>
    }

    const { getByTestId } = render(() => <TestReactiveSource />)
    expect(getByTestId('subscription-value')).toHaveTextContent('1')

    setCurrent(storageB)
    await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('2'))

    storageB.set(20)
    await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('20'))
  })

  it('should not react to the old source after switching', async () => {
    const storageA = createWebStorageValue({ type: 'sessionStorage', schema: z.number(), key: `${TEST_KEY}-a`, defaultValue: 0 })
    const storageB = createWebStorageValue({ type: 'sessionStorage', schema: z.number(), key: `${TEST_KEY}-b`, defaultValue: 10 })

    const [current, setCurrent] = createSignal<WebStorageValue<number>>(storageA)
    let runs = 0

    function TestReactiveSource() {
      const value = useSubscription(() => current())
      createEffect(() => {
        value()
        runs++
      })
      return <span data-testid="subscription-value">{value()}</span>
    }

    const { getByTestId } = render(() => <TestReactiveSource />)
    expect(getByTestId('subscription-value')).toHaveTextContent('0')

    setCurrent(storageB)
    await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('10'))
    const runsAfterSwitch = runs

    storageA.set(99)
    await Promise.resolve()
    expect(runs).toBe(runsAfterSwitch)
  })
})

describe('useSubscription with createStore', () => {
  it('should work with a basic store', async () => {
    const store = createStore(0)

    function TestStore() {
      const value = useSubscription(store)
      return <span data-testid="subscription-value">{value()}</span>
    }

    const { getByTestId } = render(() => <TestStore />)
    expect(getByTestId('subscription-value')).toHaveTextContent('0')

    store.set(10)
    await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('10'))
  })
})

describe('useSubscription cleanup', () => {
  it('should unsubscribe on unmount', () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn(() => unsubscribe)
    const sub = {
      'get': () => 1,
      'subscribe': subscribe,
      '~': { notify: () => {}, output: null as unknown as number },
    }

    const { cleanup: dispose } = renderHook(() => useSubscription(() => sub))
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(unsubscribe).not.toHaveBeenCalled()

    dispose()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})

describe('createMediaQuery', () => {
  it('should return the matches value for light and dark', async () => {
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
    expect(result()).toBe(true)

    mql.matches = false
    listener?.(new Event('change'))
    await waitFor(() => expect(result()).toBe(false))

    window.matchMedia = originalMatchMedia
  })
})
