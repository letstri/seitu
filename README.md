# Seitu

[![npm version](https://badge.fury.io/js/seitu.svg)](https://npmjs.com/package/seitu) ![You need Seitu](https://img.shields.io/badge/You_need-Seitu-purple)

Type-safe reactive primitives with one contract: `get()`, `subscribe()`, `set()`. Works with in-memory state, validated `localStorage` / IndexedDB, media queries, scroll position. Bindings for React, Vue, Solid, Svelte. SSR-safe.

[Documentation](https://seitu.letstri.dev) · [Playground](https://github.com/letstri/seitu/tree/main/playground)

```bash
pnpm add seitu
```

Import from an entry point (`seitu`, `seitu/web`, `seitu/react`, `seitu/vue`, `seitu/solid`, `seitu/svelte`, `seitu/utils`) or from a single feature to pull in nothing else:

```ts
import { createStore } from 'seitu/core/store'
import { createWebStorage } from 'seitu/web/web-storage'
```

## Examples

### State and derived values

```ts
import { createComputed, createStore } from 'seitu'

const cart = createStore({ items: [{ price: 10, qty: 2 }], coupon: 0.1 })
const total = createComputed(
  cart,
  (c) => c.items.reduce((s, i) => s + i.price * i.qty, 0) * (1 - c.coupon)
)

total.get() // 18
cart.set((c) => ({ ...c, coupon: 0 }))
total.subscribe((t) => console.log(t)) // 20
```

### Debounce and throttle

```ts
import { createDebounced, createDebouncedFn, createStore } from 'seitu'

const query = createStore('')
createDebounced(query, 300).subscribe((q) => fetch(`/search?q=${q}`))

const save = createDebouncedFn((draft: string) => api.save(draft), 500)
save('hello') // runs after 500 ms of silence
save.flush() // or now
```

### Validated `localStorage`

```ts
import { createWebStorage, createWebStorageValue } from 'seitu/web'
import * as z from 'zod'

const settings = createWebStorage({
  type: 'localStorage',
  schemas: {
    theme: z.enum(['light', 'dark']),
    sidebar: z.object({ open: z.boolean() }),
  },
  defaultValues: { theme: 'light', sidebar: { open: true } },
})

settings.set({ theme: 'dark' }) // partial update
settings.get() // { theme: 'dark', sidebar: { open: true } }, invalid data falls back to defaults

const theme = createWebStorageValue({
  type: 'localStorage',
  key: 'theme',
  schema: z.enum(['light', 'dark']),
  defaultValue: 'light',
}) // single key
theme.set('light')
```

### Cookie the server can render

```ts
import { createCookieValue } from 'seitu/web'
import * as z from 'zod'

const lang = createCookieValue({
  key: 'lang',
  schema: z.enum(['en', 'fr']),
  defaultValue: 'en',
  getServerCookies: () => requestCookieHeader, // the framework's `Cookie` header reader
}) // SSR renders the cookie value, hydration matches it
lang.set('fr')
```

### IndexedDB

```ts
import {
  createIndexedDb,
  createIndexedDbStorage,
  createIndexedDbTable,
} from 'seitu/web'
import * as z from 'zod'

const db = createIndexedDb({
  name: 'app',
  stores: {
    session: createIndexedDbStorage({
      schemas: { token: z.string().nullable() },
      defaultValues: { token: null },
    }), // key/value, sync get() via cache
    todos: createIndexedDbTable({
      keyPath: 'id',
      indexes: { status: 'status' },
      schema: z.object({ id: z.string(), status: z.enum(['open', 'done']) }),
    }), // rows, validated on write and read
  },
}) // one connection, stores created on demand

const { session, todos } = db.stores

await db.ready // open + session hydrated
await session.set({ token: 'abc' })
await todos.put({ id: '1', status: 'open' })
const open = todos.query((t) => t.index('status').getAll('open'), {
  initial: [],
}) // reactive
```

### Browser state

```ts
import { createIsOnline, createMediaQuery, createScrollState } from 'seitu/web'

const isDark = createMediaQuery({ query: '(prefers-color-scheme: dark)' }) // type-checked query
const online = createIsOnline()
const feed = createScrollState({
  element: () => document.querySelector('#feed'),
  threshold: 200,
})

feed.subscribe(({ bottom }) => bottom.reached && loadMore())
```

## Frameworks

```tsx
// React
import { useSubscription } from 'seitu/react'

function Theme() {
  const theme = useSubscription(settings, { selector: (s) => s.theme })
  return (
    <button
      onClick={() =>
        settings.set({ theme: theme === 'light' ? 'dark' : 'light' })
      }
    >
      {theme}
    </button>
  )
}
```

```vue
<!-- Vue -->
<script setup lang="ts">
import { useSubscription } from 'seitu/vue'

const theme = useSubscription(settings, { selector: (s) => s.theme })
</script>

<template>
  <button
    @click="settings.set({ theme: theme === 'light' ? 'dark' : 'light' })"
  >
    {{ theme }}
  </button>
</template>
```

```tsx
// Solid
import { useSubscription } from 'seitu/solid'

function Theme() {
  const theme = useSubscription(settings, { selector: (s) => s.theme })
  return (
    <button
      onClick={() =>
        settings.set({ theme: theme() === 'light' ? 'dark' : 'light' })
      }
    >
      {theme()}
    </button>
  )
}
```

```svelte
<!-- Svelte -->
<script lang="ts">
  import { useSubscription } from 'seitu/svelte'

  const theme = useSubscription(settings, { selector: (s) => s.theme })
</script>

<button onclick={() => settings.set({ theme: $theme === 'light' ? 'dark' : 'light' })}>{$theme}</button>
```

Inline creation (elements, props). Use a callback ref so the subscription is rebuilt when the element mounts, unmounts, or remounts:

```tsx
const [el, setEl] = useState<HTMLDivElement | null>(null)
const scroll = useSubscription(() => createScrollState({ element: el }), {
  deps: [el],
})

return <div ref={setEl} />
```

## Agent skills (TanStack Intent)

Skills ship inside the npm package and describe the installed version's API.

```bash
pnpm dlx @tanstack/intent@latest install
pnpm dlx @tanstack/intent@latest load seitu#seitu-overview
```

## License

MIT
