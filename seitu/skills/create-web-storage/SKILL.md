---
name: create-web-storage
description: >-
  Multi-key localStorage/sessionStorage with per-key schemas.
type: core
library: seitu
library_version: "0.15.1"
requires:
  - seitu-overview
  - create-web-storage-value
sources:
  - letstri/seitu:docs/content/docs/web/web-storage.mdx
  - letstri/seitu:seitu/src/web/web-storage.ts
---

# createWebStorage

Multi-key reactive handle for `localStorage` or `sessionStorage`. Each key is validated by a Standard Schema.

```ts
import { createWebStorage } from 'seitu/web'
import * as z from 'zod'

const storage = createWebStorage({
  type: 'localStorage',
  schemas: {
    token: z.string().nullable(),
    preferences: z.object({ theme: z.enum(['light', 'dark']) }),
  },
  defaultValues: { token: null, preferences: { theme: 'light' } },
})

storage.get() // { token: null, preferences: { theme: 'light' } }
storage.set({ token: 'abc' }) // partial update
storage.clear() // remove all managed keys
storage.subscribe(console.log)
```

Cross-tab sync via `StorageEvent` while subscribed.

## Options

| Option | Type | Description |
|--------|------|-------------|
| `type` | `'localStorage' \| 'sessionStorage'` | Storage backend |
| `schemas` | `Record<string, StandardSchema>` | Validators per key |
| `defaultValues` | matching record | Default values per key |
| `keyTransform?` | `(key) => string` | Remap logical key to storage key |
| `onValidationError?` | `(props) => void \| value` | Handle invalid stored data |

## Interface

```ts
interface WebStorage<O> extends Subscribable<O>, Readable<O>, Writable<Partial<O>, O>, Clearable {}
```

## Patterns

### Prefixed keys

```ts
const storage = createWebStorage({
  type: 'localStorage',
  schemas: { theme: z.string() },
  defaultValues: { theme: 'light' },
  keyTransform: key => `myapp:${String(key)}`,
})
```
## Common Mistakes

### [MEDIUM] Mixing storage types on one instance

Wrong:

```ts
storage.set({ key: 'a', type: 'sessionStorage' })
```

Correct:

```ts
createWebStorage({ type: 'localStorage', schemas, defaultValues })
```

type is fixed at creation for the whole WebStorage instance.

### [HIGH] Key not in schemas map

Wrong:

```ts
storage.set({ unknown: 1 })
```

Correct:

```ts
createWebStorage({ schemas: { count: z.number() }, defaultValues: { count: 0 } })
```

Only declared keys are typed and validated.

### [MEDIUM] Expecting cross-tab sync automatically

Wrong:

```ts
// assumes other tabs trigger subscribe without storage listener
```

Correct:

```ts
storage.subscribe(v => syncUI(v))
```

storage event handling depends on implementation; verify subscribe fires on external changes.

## See also

- [`create-web-storage-value`](../create-web-storage-value/SKILL.md) — Multi-key storage exposes single-key handles via createWebStorageValue.

## Source

`src/web/web-storage.ts`