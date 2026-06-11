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
pnpm dlx @tanstack/intent@latest load seitu#create-store
```

When you `pnpm update seitu`, skills update with the package — knowledge travels through npm, not model training cutoffs.

Start with **`seitu-overview`** — module map, mental model, and decision tree.

## Manual install (Cursor)

Copy skill folders into `.cursor/skills/`:

```bash
cp -r node_modules/seitu/skills/seitu-overview .cursor/skills/
cp -r node_modules/seitu/skills/create-store .cursor/skills/
```

Restart Cursor or start a new agent chat so skills are picked up.

## Skills

### Core (`seitu`)

| Skill | Intent id | When to use |
|-------|-----------|-------------|
| [seitu-overview](./seitu-overview/SKILL.md) | `seitu#seitu-overview` | Read first — module map and primitive selection |
| [create-store](./create-store/SKILL.md) | `seitu#create-store` | Simple in-memory reactive state |
| [create-schema-store](./create-schema-store/SKILL.md) | `seitu#create-schema-store` | Schema-validated state (Zod, Valibot, ArkType) |
| [create-computed](./create-computed/SKILL.md) | `seitu#create-computed` | Derived read-only values |
| [create-debounced](./create-debounced/SKILL.md) | `seitu#create-debounced` | Debounce subscribable updates |
| [create-throttled](./create-throttled/SKILL.md) | `seitu#create-throttled` | Throttle subscribable updates |
| [create-debounced-fn](./create-debounced-fn/SKILL.md) | `seitu#create-debounced-fn` | Debounced function with reactive result |
| [create-throttled-fn](./create-throttled-fn/SKILL.md) | `seitu#create-throttled-fn` | Throttled function with reactive result |
| [create-subscription](./create-subscription/SKILL.md) | `seitu#create-subscription` | Low-level subscribe/notify |
| [create-readable-subscription](./create-readable-subscription/SKILL.md) | `seitu#create-readable-subscription` | Compose standard Readable & Subscribable |

### Web (`seitu/web`)

| Skill | Intent id | When to use |
|-------|-----------|-------------|
| [create-web-storage-value](./create-web-storage-value/SKILL.md) | `seitu#create-web-storage-value` | Single-key localStorage / sessionStorage |
| [create-web-storage](./create-web-storage/SKILL.md) | `seitu#create-web-storage` | Multi-key web storage |
| [create-indexed-db-storage](./create-indexed-db-storage/SKILL.md) | `seitu#create-indexed-db-storage` | Large or async IndexedDB state |
| [create-media-query](./create-media-query/SKILL.md) | `seitu#create-media-query` | Reactive CSS media queries |
| [create-is-online](./create-is-online/SKILL.md) | `seitu#create-is-online` | Online / offline status |
| [create-scroll-state](./create-scroll-state/SKILL.md) | `seitu#create-scroll-state` | Scroll position and edges |

### React (`seitu/react`)

| Skill | Intent id | When to use |
|-------|-----------|-------------|
| [use-subscription-react](./use-subscription-react/SKILL.md) | `seitu#use-subscription-react` | Hook for any Seitu primitive |
| [subscription-react](./subscription-react/SKILL.md) | `seitu#subscription-react` | Render-prop component |

### Vue (`seitu/vue`)

| Skill | Intent id | When to use |
|-------|-----------|-------------|
| [use-subscription-vue](./use-subscription-vue/SKILL.md) | `seitu#use-subscription-vue` | Composable for any Seitu primitive |

### Solid (`seitu/solid`)

| Skill | Intent id | When to use |
|-------|-----------|-------------|
| [use-subscription-solid](./use-subscription-solid/SKILL.md) | `seitu#use-subscription-solid` | Primitive returning an accessor for any Seitu primitive |
| [subscription-solid](./subscription-solid/SKILL.md) | `seitu#subscription-solid` | Render-prop component |

### Svelte (`seitu/svelte`)

| Skill | Intent id | When to use |
|-------|-----------|-------------|
| [use-subscription-svelte](./use-subscription-svelte/SKILL.md) | `seitu#use-subscription-svelte` | Binding returning a Svelte `Readable` store for any Seitu primitive |

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
