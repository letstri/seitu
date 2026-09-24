# Seitu agent skills

These skills teach AI assistants how to integrate [Seitu](https://seitu.letstri.dev) in **your** app — not how to work on the Seitu library monorepo.

Skills ship inside the `seitu` npm package and are versioned with each release. 
## Install

With any skills-aware agent:

```bash
npx skills add letstri/seitu
```

Start with **`seitu-overview`** — module map, mental model, and decision tree.

## Manual install

Copy the skill folders that match your installed version into `.agents/skills/`:

```bash
cp -r node_modules/seitu/skills/seitu-overview .agents/skills/
cp -r node_modules/seitu/skills/seitu .agents/skills/
cp -r node_modules/seitu/skills/seitu-setup .agents/skills/
```

Restart Cursor or start a new agent chat so skills are picked up.

## Skills

| Skill | When to use |
|-------|-------------|
| [seitu-overview](./seitu-overview/SKILL.md) | Read first — module map, mental model, decision tree |
| [seitu](./seitu/SKILL.md) | Everything past the overview: per-primitive API and framework bindings, routed through reference files |
| [seitu-setup](./seitu-setup/SKILL.md) | Adopt Seitu in an existing project: install, find hand-rolled state and browser subscriptions, replace them without losing stored data |

### `seitu` reference files

| Reference | Covers |
|-----------|--------|
| [create-store.md](./seitu/references/create-store.md) | Simple in-memory reactive state |
| [create-schema-store.md](./seitu/references/create-schema-store.md) | Schema-validated state (Zod, Valibot, ArkType) |
| [create-computed.md](./seitu/references/create-computed.md) | Derived read-only values |
| [create-debounced.md](./seitu/references/create-debounced.md) | Debounce subscribable updates |
| [create-throttled.md](./seitu/references/create-throttled.md) | Throttle subscribable updates |
| [create-debounced-fn.md](./seitu/references/create-debounced-fn.md) | Debounced function with reactive result |
| [create-throttled-fn.md](./seitu/references/create-throttled-fn.md) | Throttled function with reactive result |
| [create-subscription.md](./seitu/references/create-subscription.md) | Low-level subscribe/notify |
| [create-readable-subscription.md](./seitu/references/create-readable-subscription.md) | Compose standard Readable & Subscribable |
| [create-web-storage-value.md](./seitu/references/create-web-storage-value.md) | Single-key localStorage / sessionStorage |
| [create-web-storage.md](./seitu/references/create-web-storage.md) | Multi-key web storage |
| [create-indexed-db-storage.md](./seitu/references/create-indexed-db-storage.md) | Large or async IndexedDB state |
| [create-media-query.md](./seitu/references/create-media-query.md) | Reactive CSS media queries |
| [create-is-online.md](./seitu/references/create-is-online.md) | Online / offline status |
| [create-scroll-state.md](./seitu/references/create-scroll-state.md) | Scroll position and edges |
| [react.md](./seitu/references/react.md) | `useSubscription` hook + `Subscription` component |
| [vue.md](./seitu/references/vue.md) | `useSubscription` composable |
| [solid.md](./seitu/references/solid.md) | `useSubscription` primitive + `Subscription` component |
| [svelte.md](./seitu/references/svelte.md) | `useSubscription` binding |

## Without skills

- Official docs: https://seitu.letstri.dev/docs
- LLM-oriented export: https://seitu.letstri.dev/llms.txt

## Maintainer workflow (this repo)

Keep skills aligned with `docs/content/docs/` when public API changes. Update `library_version` in SKILL frontmatter when cutting a release.
