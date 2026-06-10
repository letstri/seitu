---
name: createMediaQuery
description: >-
  Create a reactive boolean for CSS media queries with type-safe query strings.
  Use when tracking media query matches reactively.
---

# createMediaQuery

Reactive boolean for CSS media queries. Provides type-safe query string with autocomplete for known media features.

```ts
import { createMediaQuery } from 'seitu/web'

const isDark = createMediaQuery({ query: '(prefers-color-scheme: dark)' })
const isDesktop = createMediaQuery({ query: '(min-width: 768px)' })

isDark.get() // boolean
isDark.subscribe(matches => console.log(matches))
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `query` | type-safe string | CSS media query |
| `defaultMatches?` | `boolean` | SSR fallback (default `false`) |

## Interface

```ts
interface MediaQuery extends Subscribable<boolean>, Readable<boolean> {}
```

Read-only. Lazy — listens to `change` events only while subscribed.

## Type-safe queries

The `query` option provides autocomplete for standard media features: `min-width`, `max-width`, `prefers-color-scheme`, `orientation`, `hover`, `pointer`, etc. Supports `and`/`,` combinators.

## Source

`seitu/src/web/media-query.ts`
