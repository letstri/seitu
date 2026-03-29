import type { SessionStorageValue } from '../web/session-storage-value'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import * as z from 'zod'
import { createStore } from '../core/store'
import { createSessionStorage } from '../web/session-storage'
import { createSessionStorageValue } from '../web/session-storage-value'
import { useSubscription } from './composables'
import { mount } from './test-utils'

afterEach(() => {
  window.sessionStorage.clear()
})

const TEST_KEY = 'seitu-vue-test-key'

describe('useSubscription', () => {
  describe('no selector', () => {
    it('should return the value', () => {
      const subscription = {
        'get': () => 1,
        'subscribe': () => () => {},
        '~': {
          notify: () => {},
          output: null as unknown as number,
        },
      }

      const comp = defineComponent({
        setup() {
          const value = useSubscription(subscription)
          return () => h('span', { 'data-testid': 'value' }, String(value.value))
        },
      })

      const wrapper = mount(comp)
      expect(wrapper.textContent).toBe('1')
    })

    it('should update when session storage value changes', async () => {
      const storage = createSessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })

      const comp = defineComponent({
        setup() {
          const value = useSubscription(storage)
          return () => h('span', { 'data-testid': 'value' }, String(value.value))
        },
      })

      const wrapper = mount(comp)
      expect(wrapper.textContent).toBe('0')

      storage.set(42)
      await nextTick()
      expect(wrapper.textContent).toBe('42')
    })
  })

  describe('with selector', () => {
    it('should update when selected value changes', async () => {
      const storage = createSessionStorage({ schemas: { count: z.number() }, defaultValues: { count: 0 } })

      const comp = defineComponent({
        setup() {
          const value = useSubscription(storage, { selector: v => v.count })
          return () => h('span', null, String(value.value))
        },
      })

      const wrapper = mount(comp)
      expect(wrapper.textContent).toBe('0')

      storage.set({ count: 42 })
      await nextTick()
      expect(wrapper.textContent).toBe('42')
    })

    it('should not trigger when selected value is deeply equal', async () => {
      const storage = createSessionStorage({
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })

      let renderCount = 0

      const comp = defineComponent({
        setup() {
          const value = useSubscription(storage, { selector: v => v.count })
          return () => {
            renderCount++
            return h('span', null, String(value.value))
          }
        },
      })

      const wrapper = mount(comp)
      expect(wrapper.textContent).toBe('0')
      expect(renderCount).toBe(1)

      storage.set({ count: 1, name: 'test' })
      await nextTick()
      expect(wrapper.textContent).toBe('1')
      expect(renderCount).toBe(2)

      storage.set({ count: 1, name: 'new test' })
      await nextTick()
      expect(wrapper.textContent).toBe('1')
      expect(renderCount).toBe(2)
    })
  })

  describe('with getter source', () => {
    it('should resubscribe when getter returns new subscription', async () => {
      const storageA = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-a`, defaultValue: 1 })
      const storageB = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-b`, defaultValue: 2 })

      const current = ref<SessionStorageValue<number>>(storageA)

      const comp = defineComponent({
        setup() {
          const value = useSubscription(() => current.value)
          return () => h('span', null, String(value.value))
        },
      })

      const wrapper = mount(comp)
      expect(wrapper.textContent).toBe('1')

      current.value = storageB
      await nextTick()
      expect(wrapper.textContent).toBe('2')
    })

    it('should subscribe to the new source after switching', async () => {
      const storageA = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-a`, defaultValue: 0 })
      const storageB = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-b`, defaultValue: 10 })

      const current = ref<SessionStorageValue<number>>(storageA)

      const comp = defineComponent({
        setup() {
          const value = useSubscription(() => current.value)
          return () => h('span', null, String(value.value))
        },
      })

      const wrapper = mount(comp)
      expect(wrapper.textContent).toBe('0')

      current.value = storageB
      await nextTick()
      expect(wrapper.textContent).toBe('10')

      storageB.set(20)
      await nextTick()
      expect(wrapper.textContent).toBe('20')
    })

    it('should not react to old source after switching', async () => {
      const storageA = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-a`, defaultValue: 0 })
      const storageB = createSessionStorageValue({ schema: z.number(), key: `${TEST_KEY}-b`, defaultValue: 10 })

      const current = ref<SessionStorageValue<number>>(storageA)
      let renderCount = 0

      const comp = defineComponent({
        setup() {
          const value = useSubscription(() => current.value)
          return () => {
            renderCount++
            return h('span', null, String(value.value))
          }
        },
      })

      mount(comp)
      expect(renderCount).toBe(1)

      current.value = storageB
      await nextTick()
      const countAfterSwitch = renderCount

      storageA.set(99)
      await nextTick()
      expect(renderCount).toBe(countAfterSwitch)
    })
  })

  describe('with ref source', () => {
    it('should work with a ref wrapping the subscription', async () => {
      const storage = createSessionStorageValue({ schema: z.number(), key: TEST_KEY, defaultValue: 0 })
      const storageRef = ref(storage)

      const comp = defineComponent({
        setup() {
          const value = useSubscription(storageRef)
          return () => h('span', null, String(value.value))
        },
      })

      const wrapper = mount(comp)
      expect(wrapper.textContent).toBe('0')

      storage.set(5)
      await nextTick()
      expect(wrapper.textContent).toBe('5')
    })
  })

  describe('with createStore', () => {
    it('should work with a basic store', async () => {
      const store = createStore(0)

      const comp = defineComponent({
        setup() {
          const value = useSubscription(store)
          return () => h('span', null, String(value.value))
        },
      })

      const wrapper = mount(comp)
      expect(wrapper.textContent).toBe('0')

      store.set(10)
      await nextTick()
      expect(wrapper.textContent).toBe('10')
    })
  })
})
