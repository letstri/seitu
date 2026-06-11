---
name: createSchemaStore
description: >-
  Create a schema-validated reactive store with Seitu. Use when building state
  that must conform to a Standard Schema (Zod, Valibot, ArkType).
---

# createSchemaStore

Store validated by a Standard Schema. Falls back to `defaultValue` when validation fails.

```ts
import { createSchemaStore } from 'seitu'
import * as z from 'zod'

const store = createSchemaStore({
  schema: z.object({ count: z.number(), name: z.string() }),
  defaultValue: { count: 0, name: '' },
})

store.get() // { count: 0, name: '' }
store.set({ count: 1, name: 'alice' })
store.subscribe(console.log)
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `schema` | `StandardSchemaV1` | Any Standard Schema validator |
| `defaultValue` | inferred from schema | Fallback value on validation failure |
| `onValidationError?` | `(props) => void \| value` | Handle invalid data; return corrected value or undefined for default |

## Interface

```ts
interface SchemaStore<O> extends Subscribable<O>, Readable<O>, Writable<O, O> {}
```

## Source

`seitu/src/core/schema-store.ts`
