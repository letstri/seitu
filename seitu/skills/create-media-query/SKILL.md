---
name: create-media-query
description: >-
  Reactive CSS media query with SSR defaultMatches.
type: core
library: seitu
library_version: "0.15.1"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/web/media-query.mdx
  - letstri/seitu:seitu/src/web/media-query.ts
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
## Common Mistakes

### [CRITICAL] Missing defaultMatches for SSR

Wrong:

```ts
createMediaQuery({ query: '(min-width: 768px)' })
```

Correct:

```ts
createMediaQuery({ query: '(min-width: 768px)', defaultMatches: true })
```

get() returns false when window is undefined unless defaultMatches is set.

### [HIGH] Invalid media query string

Wrong:

```ts
createMediaQuery({ query: '(min-width: 768' })
```

Correct:

```ts
createMediaQuery({ query: '(min-width: 768px)' })
```

Malformed queries throw at creation time in the browser.

### [HIGH] Creating query inside component each render

Wrong:

```ts
function Layout() {
  const mq = createMediaQuery({ query: '...' })
}
```

Correct:

```ts
const isDesktop = createMediaQuery({ query: '(min-width: 768px)' })
```

New matchMedia listener per render; use module-level singleton.

## Source

`src/web/media-query.ts`