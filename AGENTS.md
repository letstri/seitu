# Agent guide (Seitu repository)

This repo is the **Seitu** monorepo (library, docs site, playground). Most agents here are **maintainers** working on the package, docs, or examples.

## Consumer skills (for app developers)

Skills for teams **using** Seitu ship in the published npm package at [`seitu/skills/`](seitu/skills/README.md). Repo-root [`skills/seitu`](skills/seitu) is a symlink alias (same pattern as [redux-toolkit/skills](https://github.com/reduxjs/redux-toolkit/tree/master/skills)) so GitHub resolves skills from the monorepo root. Consumers install via `npx skills add letstri/seitu` or copy from `node_modules/seitu/skills/`.

When you change public API behavior, docs examples, or integration patterns, keep `seitu/skills/` aligned with `docs/content/docs/` and bump `library_version` in SKILL frontmatter on release.

## Repository layout

| Path | Purpose |
| --- | --- |
| `seitu/` | Published npm package (`seitu`); build inside this folder |
| `seitu/src/core/` | Core stores, computed, debounce/throttle, subscriptions |
| `seitu/src/web/` | Browser adapters (storage, media query, scroll, online) |
| `seitu/src/react/`, `seitu/src/vue/` | Framework bindings |
| `docs/` | Documentation site |
| `docs/content/docs/` | MDX documentation pages |
| `playground/` | Example app — reference when validating integrations |
| `seitu/skills/` | Agent skills shipped in the npm package |
| `skills/seitu` | Symlink → `seitu/skills/` for monorepo-root discovery |

Docs site: https://seitu.letstri.dev — machine-readable export: `/llms.txt` on the docs app.

## Maintainer commands

From repo root:

```bash
pnpm install
pnpm test && pnpm run check-types
pnpm run lint
pnpm run format
pnpm run format:check
cd seitu && pnpm run build
cd docs && pnpm dev
```

Do not commit unless the user asks.
