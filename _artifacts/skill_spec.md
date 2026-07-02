# Seitu — Skill Spec

Seitu is a type-safe reactive primitives library. Framework-agnostic core (`seitu`), browser adapters (`seitu/web`), and optional React/Vue/Solid/Svelte bindings share one `get()` / `subscribe()` API.

## Domains

| Domain | Description | Skills |
| ------ | ----------- | ------ |
| orientation | Module map and primitive selection | seitu-overview |
| reactive-state + browser-integration + framework-bindings | Per-primitive API and framework bindings, routed through reference files | seitu |

## Skill Inventory

| Skill | Type | Domain | What it covers | Load when |
| ----- | ---- | ------ | --------------- | --------- |
| seitu-overview | lifecycle | orientation | imports, mental model, decision tree, SSR | Always — read first |
| seitu | core | reactive-state + browser-integration + framework-bindings | createStore, createSchemaStore, createComputed, createDebounced(Fn), createThrottled(Fn), createSubscription, createReadableSubscription, createWebStorage(Value), createIndexedDbStorage, createMediaQuery, createIsOnline, createScrollState, React/Vue/Solid/Svelte `useSubscription`/`Subscription` | Past the overview — thin `SKILL.md` router with 19 reference files loaded on demand |

`seitu` is a single skill with a thin `SKILL.md` router and reference files under
`skills/seitu/references/`: `create-store.md`, `create-schema-store.md`,
`create-computed.md`, `create-debounced.md`, `create-throttled.md`,
`create-debounced-fn.md`, `create-throttled-fn.md`, `create-subscription.md`,
`create-readable-subscription.md`, `create-web-storage-value.md`,
`create-web-storage.md`, `create-indexed-db-storage.md`,
`create-media-query.md`, `create-is-online.md`, `create-scroll-state.md`,
`react.md`, `vue.md`, `solid.md`, `svelte.md`.

## Recommended Skill File Structure

- **Two skills** — `seitu-overview` (lifecycle, load first) and `seitu` (core, router + references).
- **Lifecycle:** `seitu-overview` — load first for routing.
- **`seitu` declares** `requires: [seitu-overview]`.

## Composition Opportunities

| Library | Integration points | Composition skill needed? |
| ------- | ------------------ | ------------------------- |
| zod | Standard Schema on storage and schema stores | no — documented per reference file |
| react | useSubscription hook + Subscription component | no — covered by `references/react.md` |
| vue | useSubscription composable | no — covered by `references/vue.md` |
| solid | useSubscription primitive + Subscription component | no — covered by `references/solid.md` |
| svelte | useSubscription binding | no — covered by `references/svelte.md` |

## Registry

Package keyword `tanstack-intent` enables discovery on the [Agent Skills Registry](https://tanstack.com/intent/registry). Each npm release re-indexes skills and version history automatically.
