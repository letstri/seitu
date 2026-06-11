# Agent guide (Seitu repository)

This repo is the **Seitu** monorepo (library, docs site, playground). Most agents here are **maintainers** working on the package, docs, or examples.

## Consumer skills (for app developers)

Skills for teams **using** Seitu ship in the published npm package at [`seitu/skills/`](seitu/skills/README.md). Repo-root [`skills/seitu`](skills/seitu) is a symlink alias (same pattern as [redux-toolkit/skills](https://github.com/reduxjs/redux-toolkit/tree/master/skills)) so CI and GitHub resolve skills from the monorepo root. Consumers install via [TanStack Intent](https://tanstack.com/intent/latest/docs/overview) (`pnpm dlx @tanstack/intent@latest install`) or copy from `node_modules/seitu/skills/`.

Repo-root [`_artifacts/`](_artifacts/skill_tree.yaml) (`domain_map.yaml`, `skill_spec.md`, `skill_tree.yaml`) tracks skill coverage and source-doc references for CI staleness checks.

When you change public API behavior, docs examples, or integration patterns, keep `seitu/skills/` aligned with `docs/content/docs/`, bump `library_version` in SKILL frontmatter on release, and run `cd seitu && pnpm run skills:stale`.

## Repository layout

| Path | Purpose |
|------|---------|
| `seitu/` | Published npm package (`seitu`); build inside this folder |
| `seitu/src/core/` | Core stores, computed, debounce/throttle, subscriptions |
| `seitu/src/web/` | Browser adapters (storage, media query, scroll, online) |
| `seitu/src/react/`, `seitu/src/vue/` | Framework bindings |
| `docs/` | Documentation site |
| `docs/content/docs/` | MDX documentation pages |
| `playground/` | Example app — reference when validating integrations |
| `seitu/skills/` | Agent skills shipped in the npm package (TanStack Intent) |
| `skills/seitu` | Symlink → `seitu/skills/` for monorepo-root discovery and CI |
| `_artifacts/` | Intent domain map, skill spec, and skill tree for CI staleness |

Docs site: https://seitu.letstri.dev — machine-readable export: `/llms.txt` on the docs app.

## Maintainer commands

From repo root:

```bash
pnpm install
pnpm test && pnpm run check-types
pnpm run lint
cd seitu && pnpm run build
cd docs && pnpm dev
```

Skill maintenance (from `seitu/`):

```bash
pnpm run skills:validate    # structure + packaging before publish
pnpm run skills:stale       # flag drift vs docs/sources
pnpm run skills:sync-state  # refresh source SHAs after doc/source edits
pnpm run skills:upgrade     # re-apply frontmatter + Common Mistakes from _artifacts
```

Do not commit unless the user asks.
