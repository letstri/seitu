import type { SessionStorage } from '../web/session-storage'
import type { SessionStorageValue } from '../web/session-storage-value'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as z from 'zod'
import { createSessionStorage } from '../web/session-storage'
import { sessionStorageValue } from '../web/session-storage-value'
import { useSubscription } from './hooks'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const TEST_KEY = 'utla-hooks-test-key'

function TestComponent({ storage }: { storage: SessionStorageValue<number> }) {
  const value = useSubscription(storage)
  return <span data-testid="subscription-value">{value}</span>
}

function TestComponentWithSelector({ storage }: { storage: SessionStorage<{ count: number }> }) {
  const value = useSubscription(storage, value => value.count)
  return <span data-testid="subscription-value">{value}</span>
}

describe('hooks', () => {
  describe('useSubscription no selector', () => {
    it('should return the value', () => {
      const subscription = {
        'get': () => 1,
        'subscribe': () => () => {},
        '~types': {
          output: null as unknown as number,
        },
      }
      const { result } = renderHook(() => useSubscription(subscription))
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

      act(() => {
        storage.remove()
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')
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
        const value = useSubscription(s, value => value.count)
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
})
