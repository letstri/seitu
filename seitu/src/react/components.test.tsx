import { act, cleanup, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import * as z from 'zod'
import { createSessionStorage } from '../web/session-storage'
import { createSessionStorageValue } from '../web/session-storage-value'
import { Subscription } from './components'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const TEST_KEY = 'seitu-components-test-key'

describe('subscription', () => {
  describe('without selector', () => {
    it('should render children with the current value', () => {
      const storage = createSessionStorageValue({
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 42,
      })

      render(
        <Subscription value={storage}>
          {value => <span data-testid="subscription-value">{value}</span>}
        </Subscription>,
      )
      expect(screen.getByTestId('subscription-value').textContent).toBe('42')
    })

    it('should update children when subscription value changes', () => {
      const storage = createSessionStorageValue({
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })

      render(
        <Subscription value={storage}>
          {value => <span data-testid="subscription-value">{value}</span>}
        </Subscription>,
      )
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')

      act(() => {
        storage.set(99)
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('99')
    })
  })

  describe('with selector', () => {
    it('should render children with the selected value', () => {
      const storage = createSessionStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 10 },
      })

      render(
        <Subscription
          value={storage}
          selector={value => value.count}
        >
          {value => <span data-testid="subscription-value">{value}</span>}
        </Subscription>,
      )
      expect(screen.getByTestId('subscription-value').textContent).toBe('10')
    })

    it('should update children when subscription value changes', () => {
      const storage = createSessionStorage({
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })

      render(
        <Subscription
          value={storage}
          selector={value => value.count}
        >
          {value => <span data-testid="subscription-value">{value}</span>}
        </Subscription>,
      )
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')

      act(() => {
        storage.set({ count: 42 })
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('42')
    })

    it('should not re-render when value is the same', () => {
      const storage = createSessionStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })

      let renders = 0
      render(
        <Subscription value={storage} selector={value => value.count}>
          {(value) => {
            renders++
            return <span data-testid="subscription-value">{value}</span>
          }}
        </Subscription>,
      )
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')
      expect(renders).toBe(1)

      act(() => {
        storage.set({ count: 0, name: 'test' })
      })
      expect(screen.getByTestId('subscription-value').textContent).toBe('0')
      expect(renders).toBe(1)
    })
  })
})
