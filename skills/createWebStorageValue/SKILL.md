---
name: createWebStorageValue
description: >-
  Create a single-key reactive handle for localStorage/sessionStorage with schema
  validation. Use when persisting a single value to web storage with Seitu.
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

## Source

`seitu/src/web/web-storage-value.ts`
