import { cleanup, render, waitFor } from '@solidjs/testing-library'
import { createEffect } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'
import * as z from 'zod'
import { createWebStorage } from '../web/web-storage'
import { createWebStorageValue } from '../web/web-storage-value'
import { Subscription } from './components'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const TEST_KEY = 'seitu-solid-components-test-key'

describe('subscription', () => {
  describe('without selector', () => {
    it('should render children with the current value', () => {
      const storage = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 42,
      })

      const { getByTestId } = render(() => (
        <Subscription value={storage}>
          {value => <span data-testid="subscription-value">{value()}</span>}
        </Subscription>
      ))
      expect(getByTestId('subscription-value')).toHaveTextContent('42')
    })

    it('should update children when subscription value changes', async () => {
      const storage = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })

      const { getByTestId } = render(() => (
        <Subscription value={storage}>
          {value => <span data-testid="subscription-value">{value()}</span>}
        </Subscription>
      ))
      expect(getByTestId('subscription-value')).toHaveTextContent('0')

      storage.set(99)
      await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('99'))
    })
  })

  describe('with selector', () => {
    it('should render children with the selected value', () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number() },
        defaultValues: { count: 10 },
      })

      const { getByTestId } = render(() => (
        <Subscription value={storage} selector={value => value.count}>
          {value => <span data-testid="subscription-value">{value()}</span>}
        </Subscription>
      ))
      expect(getByTestId('subscription-value')).toHaveTextContent('10')
    })

    it('should update children when subscription value changes', async () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })

      const { getByTestId } = render(() => (
        <Subscription value={storage} selector={value => value.count}>
          {value => <span data-testid="subscription-value">{value()}</span>}
        </Subscription>
      ))
      expect(getByTestId('subscription-value')).toHaveTextContent('0')

      storage.set({ count: 42 })
      await waitFor(() => expect(getByTestId('subscription-value')).toHaveTextContent('42'))
    })

    it('should not update when value is the same', async () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })

      let runs = 0
      const { getByTestId } = render(() => (
        <Subscription value={storage} selector={value => value.count}>
          {(value) => {
            createEffect(() => {
              value()
              runs++
            })
            return <span data-testid="subscription-value">{value()}</span>
          }}
        </Subscription>
      ))
      expect(getByTestId('subscription-value')).toHaveTextContent('0')
      expect(runs).toBe(1)

      storage.set({ count: 0, name: 'test' })
      await Promise.resolve()
      expect(getByTestId('subscription-value')).toHaveTextContent('0')
      expect(runs).toBe(1)
    })
  })
})
