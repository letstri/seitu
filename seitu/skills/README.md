# Seitu agent skills (TanStack Intent)

These skills teach AI assistants how to integrate [Seitu](https://seitu.letstri.dev) in **your** app — not how to work on the Seitu library monorepo.

Skills ship inside the `seitu` npm package and are versioned with each release. They include `sources` metadata pointing at docs and source files so maintainers can detect drift when documentation changes.

## Install via npm (recommended)

After adding Seitu to your project:

```bash
pnpm add seitu
pnpm dlx @tanstack/intent@latest install
```

Intent discovers `seitu` in `node_modules`, reads the skills bundled with your installed version, and writes lightweight skill-loading guidance into your agent config (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, etc.).

List or load a specific skill:

```bash
pnpm dlx @tanstack/intent@latest list
pnpm dlx @tanstack/intent@latest load seitu#seitu
```

When you `pnpm update seitu`, skills update with the package — knowledge travels through npm, not model training cutoffs.

Start with **`seitu-overview`** — module map, mental model, and decision tree.

## Manual install (Cursor)

Copy skill folders into `.agents/skills/`:

```bash
cp -r node_modules/seitu/skills/seitu-overview .agents/skills/
cp -r node_modules/seitu/skills/seitu .agents/skills/
```

Restart Cursor or start a new agent chat so skills are picked up.

## Skills

| Skill | Intent id | When to use |
|-------|-----------|-------------|
| [seitu-overview](./seitu-overview/SKILL.md) | `seitu#seitu-overview` | Read first — module map, mental model, decision tree |
| [seitu](./seitu/SKILL.md) | `seitu#seitu` | Everything past the overview: per-primitive API and framework bindings, routed through reference files |

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

## Registry and version history

The package includes the `tanstack-intent` npm keyword. Published versions are indexed on the [Agent Skills Registry](https://tanstack.com/intent/registry) with skill history per release.

## Without skills

- Official docs: https://seitu.letstri.dev/docs
- LLM-oriented export: https://seitu.letstri.dev/llms.txt

## Maintainer workflow (this repo)

From `seitu/`:

```bash
pnpm run skills:validate   # structure + packaging before publish
pnpm run skills:stale      # flag drift vs docs/sources
pnpm run skills:sync-state # refresh source SHAs after doc/source edits
pnpm run skills:upgrade    # re-apply frontmatter + Common Mistakes from _artifacts
```

CI runs `intent validate` on PRs and `intent stale` after releases (`.github/workflows/check-skills.yml`). Update `library_version` in SKILL frontmatter when cutting a release.
