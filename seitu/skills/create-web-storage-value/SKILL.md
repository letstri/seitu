---
name: create-web-storage-value
description: >-
  Single-key localStorage/sessionStorage with schema validation.
type: core
library: seitu
library_version: "0.16.0"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/web/web-storage-value.mdx
  - letstri/seitu:seitu/src/web/web-storage-value.ts
---

# createWebStorageValue

Single-key reactive handle for web storage. Two overloads: standalone (with schema) or derived from a WebStorage instance.

## Standalone (with schema)

```ts
import { createWebStorageValue } from 'seitu/web'
import * as z from 'zod'

const count = createWebStorageValue({
  type: 'localStorage',
  key: 'count',
  schema: z.number(),
  defaultValue: 0,
})

count.get() // 0
count.set(1)
count.set(v => v + 1)
count.clear()
```

## Derived from WebStorage

```ts
import { createWebStorage, createWebStorageValue } from 'seitu/web'

const storage = createWebStorage({ /* ... */ })
const token = createWebStorageValue({ storage, key: 'token' })
```

Inherits schema, default, and storage type from the parent.

## Options (standalone)

| Option | Type | Description |
|--------|------|-------------|
| `type` | `'localStorage' \| 'sessionStorage'` | Storage backend |
| `key` | `string` | Storage key |
| `schema` | `StandardSchemaV1` | Validator |
| `defaultValue` | inferred | Fallback value |
| `onValidationError?` | `(props) => void \| value` | Handle invalid data |

## Interface

```ts
interface WebStorageValue<V> extends Subscribable<V>, Readable<V>, Writable<V>, Clearable {}
```
## Common Mistakes

### [HIGH] Accessing storage during SSR without defaults

Wrong:

```ts
if (typeof window !== 'undefined') {
  const v = createWebStorageValue({ ... })
}
```

Correct:

```ts
const v = createWebStorageValue({ type: 'localStorage', key: 'x', schema, defaultValue })
```

Primitives return defaultValue when window is undefined — safe at module level.

### [CRITICAL] Missing schema on standalone overload

Wrong:

```ts
createWebStorageValue({ type: 'localStorage', key: 'count' })
```

Correct:

```ts
createWebStorageValue({ type: 'localStorage', key: 'count', schema: z.number(), defaultValue: 0 })
```

Standalone overload requires schema and defaultValue.

### [CRITICAL] Creating new instance per render in React

Wrong:

```ts
useSubscription(createWebStorageValue({ key: 'x', ... }))
```

Correct:

```ts
useSubscription(() => createWebStorageValue({ key: 'x', ... }), { deps: [userId] })
```

Each instance uses a different storage subscription; use module singleton or useSubscription factory with deps.

## Source

`src/web/web-storage-value.ts`