---
name: seitu
description: >-
  Per-primitive API for Seitu: createStore, createComputed, createSchemaStore,
  createSubscription/createReadableSubscription, createDebounced(Fn),
  createThrottled(Fn), createWebStorage(Value), createIndexedDbStorage,
  createMediaQuery, createIsOnline, createScrollState, and the React, Vue,
  Solid, and Svelte useSubscription/Subscription bindings. Use once you know
  which primitive or framework binding you need; read seitu-overview first
  for the mental model and decision tree.
metadata:
  type: core
  library: seitu
  library_version: "0.16.1"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/core/store.mdx
  - letstri/seitu:docs/content/docs/core/computed.mdx
  - letstri/seitu:docs/content/docs/core/schema-store.mdx
  - letstri/seitu:docs/content/docs/core/debounced.mdx
  - letstri/seitu:docs/content/docs/core/debounced-fn.mdx
  - letstri/seitu:docs/content/docs/core/throttled.mdx
  - letstri/seitu:docs/content/docs/core/throttled-fn.mdx
  - letstri/seitu:docs/content/docs/web/web-storage.mdx
  - letstri/seitu:docs/content/docs/web/web-storage-value.mdx
  - letstri/seitu:docs/content/docs/web/indexed-db-storage.mdx
  - letstri/seitu:docs/content/docs/web/media-query.mdx
  - letstri/seitu:docs/content/docs/web/is-online.mdx
  - letstri/seitu:docs/content/docs/web/scroll-state.mdx
  - letstri/seitu:docs/content/docs/react/hooks.mdx
  - letstri/seitu:docs/content/docs/react/components.mdx
  - letstri/seitu:docs/content/docs/vue/composables.mdx
  - letstri/seitu:docs/content/docs/solid/hooks.mdx
  - letstri/seitu:docs/content/docs/solid/components.mdx
  - letstri/seitu:docs/content/docs/svelte/hooks.mdx
  - letstri/seitu:seitu/src/core/subscription.ts
---

# Seitu — primitives and framework bindings

Assumes the mental model from **seitu-overview** (`get`/`subscribe`/`set`, no
dispatch layer, singleton at module scope). Load the reference file for the
primitive or framework you need instead of reading everything.

## In-memory state

| Task | Reference |
|------|-----------|
| Minimal store — `get`/`set`/`subscribe` | [references/create-store.md](references/create-store.md) |
| Schema-validated store with fallback | [references/create-schema-store.md](references/create-schema-store.md) |
| Derived/computed value from one or many sources | [references/create-computed.md](references/create-computed.md) |
| Low-level subscribe/notify for custom primitives | [references/create-subscription.md](references/create-subscription.md) |
| Compose `get` + subscribe/notify into `Readable & Subscribable` | [references/create-readable-subscription.md](references/create-readable-subscription.md) |

## Rate limiting

| Task | Reference |
|------|-----------|
| Debounce a subscribable source | [references/create-debounced.md](references/create-debounced.md) |
| Debounce a plain function | [references/create-debounced-fn.md](references/create-debounced-fn.md) |
| Throttle a subscribable source | [references/create-throttled.md](references/create-throttled.md) |
| Throttle a plain function | [references/create-throttled-fn.md](references/create-throttled-fn.md) |

## Browser persistence and DOM state

| Task | Reference |
|------|-----------|
| Multi-key localStorage/sessionStorage | [references/create-web-storage.md](references/create-web-storage.md) |
| Single-key localStorage/sessionStorage | [references/create-web-storage-value.md](references/create-web-storage-value.md) |
| Async IndexedDB persistence | [references/create-indexed-db-storage.md](references/create-indexed-db-storage.md) |
| CSS media query | [references/create-media-query.md](references/create-media-query.md) |
| `navigator.onLine` status | [references/create-is-online.md](references/create-is-online.md) |
| Scroll position / edges of an element | [references/create-scroll-state.md](references/create-scroll-state.md) |

## Framework bindings

One hook/composable works with **any** Seitu primitive.

| Framework | Reference |
|-----------|-----------|
| React — `useSubscription` hook, `Subscription` component | [references/react.md](references/react.md) |
| Vue — `useSubscription` composable | [references/vue.md](references/vue.md) |
| Solid — `useSubscription` primitive, `Subscription` component | [references/solid.md](references/solid.md) |
| Svelte — `useSubscription` binding | [references/svelte.md](references/svelte.md) |

## Rules that apply everywhere

- **Create primitives at module scope, not inside components/render.** A new instance per render loses shared state and re-subscribes every time.
- **Reference equality gates notification.** `set()` skips notifying subscribers when the new value is `===` the old one — always return a new object/array from updaters.
- **Framework bindings are optional peer deps and are not interchangeable.** Importing `seitu/react` hooks/components in Vue, Solid, or Svelte code (or vice versa) breaks — use the binding matching the framework you're in.
- **Web/DOM primitives are SSR-safe by default** (return defaults when `window`/`navigator` is undefined) — safe to create at module level in SSR frameworks. `createMediaQuery` needs `defaultMatches` set explicitly for a correct SSR value.
