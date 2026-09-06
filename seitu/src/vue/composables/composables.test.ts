import { afterEach, describe, expect, it } from 'vitest'
import type { Component } from 'vue'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import * as z from 'zod'

import { createStore } from '../../core/store'
import { createWebStorage } from '../../web/web-storage'
import type { WebStorageValue } from '../../web/web-storage-value'
import { createWebStorageValue } from '../../web/web-storage-value'
import { useSubscription } from './index'

function mount(component: Component): HTMLElement {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(component)
  app.mount(host)
  return host
}

afterEach(() => {
  window.sessionStorage.clear()
})

const TEST_KEY = 'seitu-vue-test-key'

describe('useSubscription', () => {
  describe('no selector', () => {
    it('should return the value', () => {
      const subscription = {
        get: () => 1,
        subscribe: () => () => {},
        '~': {
          notify: () => {},
          output: null as unknown as number,
        },
      }

      const comp = defineComponent({
        setup() {
          const value = useSubscription(subscription)
          return () =>
            h('span', { 'data-testid': 'value' }, String(value.value))
        },
      })

      const wrapper = mount(comp)
      expect(wrapper.textContent).toBe('1')
    })

    it('should update when session storage value changes', async () => {
      const storage = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })

      const comp = defineComponent({
        setup() {
          const value = useSubscription(storage)
          return () =>
            h('span', { 'data-testid': 'value' }, String(value.value))
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
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })

      const comp = defineComponent({
        setup() {
          const value = useSubscription(storage, { selector: (v) => v.count })
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
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })

      let renderCount = 0

      const comp = defineComponent({
        setup() {
          const value = useSubscription(storage, { selector: (v) => v.count })
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

  describe('with custom isEqual', () => {
    it('should use custom comparator instead of deepEqual', async () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number(), name: z.string() },
        defaultValues: { count: 0, name: '' },
      })

      let renderCount = 0

      const comp = defineComponent({
        setup() {
          const value = useSubscription(storage, {
            isEqual: (a, b) => a.count === b.count,
          })
          return () => {
            renderCount++
            return h('span', null, value.value.name)
          }
        },
      })

      const wrapper = mount(comp)
      expect(renderCount).toBe(1)
      expect(wrapper.textContent).toBe('')

      storage.set({ count: 0, name: 'changed' })
      await nextTick()
      expect(renderCount).toBe(1)
      expect(wrapper.textContent).toBe('')

      storage.set({ count: 1, name: 'changed' })
      await nextTick()
      expect(renderCount).toBe(2)
      expect(wrapper.textContent).toBe('changed')
    })

    it('should use Object.is when passed as comparator', async () => {
      const storage = createWebStorage({
        type: 'sessionStorage',
        schemas: { count: z.number() },
        defaultValues: { count: 0 },
      })

      let renderCount = 0

      const comp = defineComponent({
        setup() {
          const value = useSubscription(storage, {
            selector: (v) => v.count,
            isEqual: Object.is,
          })
          return () => {
            renderCount++
            return h('span', null, String(value.value))
          }
        },
      })

      mount(comp)
      expect(renderCount).toBe(1)

      storage.set({ count: 1 })
      await nextTick()
      expect(renderCount).toBe(2)

      storage.set({ count: 1 })
      await nextTick()
      expect(renderCount).toBe(2)
    })
  })

  describe('with getter source', () => {
    it('should resubscribe when getter returns new subscription', async () => {
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

      const current = ref<WebStorageValue<number>>(storageA)

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

      const current = ref<WebStorageValue<number>>(storageA)

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

      const current = ref<WebStorageValue<number>>(storageA)
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
      const storage = createWebStorageValue({
        type: 'sessionStorage',
        schema: z.number(),
        key: TEST_KEY,
        defaultValue: 0,
      })
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

describe('useSubscription snapshot identity', () => {
  it('preserves object snapshot identity (no deep readonly proxy)', () => {
    const obj = { count: 1 }
    const store = createStore(obj)

    let snapshot: unknown
    const comp = defineComponent({
      setup() {
        const value = useSubscription(store)
        snapshot = value.value
        return () => h('span')
      },
    })

    mount(comp)
    expect(snapshot).toBe(obj)
  })
})

describe('useSubscription SSR', () => {
  it('does not leak subscribers when rendered on the server', async () => {
    const { renderToString } = await import('vue/server-renderer')
    const { createSSRApp } = await import('vue')
    const store = createStore({ count: 1 })
    let subscribers = 0
    const tracked = {
      ...store,
      subscribe: (
        cb: (value: { count: number }) => any,
        opts?: { immediate?: boolean }
      ) => {
        subscribers++
        const unsubscribe = store.subscribe(cb, opts)
        return () => {
          subscribers--
          unsubscribe()
        }
      },
    }

    const comp = defineComponent({
      setup() {
        const value = useSubscription(tracked)
        return () => h('span', String(value.value.count))
      },
    })

    const html = await renderToString(createSSRApp(comp))
    expect(html).toContain('1')
    expect(subscribers).toBe(0)
  })
})
