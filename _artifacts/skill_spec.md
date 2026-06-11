# Seitu — Skill Spec

Seitu is a type-safe reactive primitives library. Framework-agnostic core (`seitu`), browser adapters (`seitu/web`), and optional React/Vue bindings share one `get()` / `subscribe()` API.

## Domains

| Domain | Description | Skills |
| ------ | ----------- | ------ |
| orientation | Module map and primitive selection | seitu-overview |
| reactive-state | Stores, computed, debounce/throttle, subscription primitives | create-store, create-schema-store, create-computed, create-debounced, create-throttled, create-debounced-fn, create-throttled-fn, create-subscription, create-readable-subscription |
| browser-integration | Persistence and DOM state | create-web-storage-value, create-web-storage, create-indexed-db-storage, create-media-query, create-is-online, create-scroll-state |
| framework-bindings | React and Vue integration | use-subscription-react, subscription-react, use-subscription-vue |

## Skill Inventory

| Skill | Type | Domain | What it covers | Failure modes |
| ----- | ---- | ------ | -------------- | ------------- |
| seitu-overview | lifecycle | orientation | imports, mental model, SSR | 3 |
| create-store | core | reactive-state | createStore | 3 |
| create-schema-store | core | reactive-state | createSchemaStore | 3 |
| create-computed | core | reactive-state | createComputed | 3 |
| create-debounced | core | reactive-state | createDebounced | 3 |
| create-throttled | core | reactive-state | createThrottled | 3 |
| create-debounced-fn | core | reactive-state | createDebouncedFn | 3 |
| create-throttled-fn | core | reactive-state | createThrottledFn | 3 |
| create-subscription | core | reactive-state | createSubscription | 3 |
| create-readable-subscription | core | reactive-state | createReadableSubscription | 3 |
| create-web-storage-value | core | browser-integration | createWebStorageValue | 3 |
| create-web-storage | core | browser-integration | createWebStorage | 3 |
| create-indexed-db-storage | core | browser-integration | createIndexedDbStorage | 3 |
| create-media-query | core | browser-integration | createMediaQuery | 3 |
| create-is-online | core | browser-integration | createIsOnline | 3 |
| create-scroll-state | core | browser-integration | createScrollState | 3 |
| use-subscription-react | framework | framework-bindings | useSubscription | 3 |
| subscription-react | framework | framework-bindings | Subscription | 3 |
| use-subscription-vue | framework | framework-bindings | useSubscription | 3 |

## Recommended Skill File Structure

- **Flat structure** — one `skills/<slug>/SKILL.md` per exported function (matches npm `intent list` discovery).
- **Lifecycle:** `seitu-overview` — load first for routing.
- **Framework skills:** declare `requires: [seitu-overview]`.

## Composition Opportunities

| Library | Integration points | Composition skill needed? |
| ------- | ------------------ | ------------------------- |
| zod | Standard Schema on storage and schema stores | no — documented per skill |
| react | useSubscription hook | no — dedicated framework skills |
| vue | useSubscription composable | no — dedicated framework skill |

## Registry

Package keyword `tanstack-intent` enables discovery on the [Agent Skills Registry](https://tanstack.com/intent/registry). Each npm release re-indexes skills and version history automatically.
