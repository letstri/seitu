---
name: create-schema-store
description: >-
  Standard Schema validated store with default fallback on invalid data.
type: core
library: seitu
library_version: "0.16.0"
requires:
  - seitu-overview
sources:
  - letstri/seitu:docs/content/docs/core/schema-store.mdx
  - letstri/seitu:seitu/src/core/schema-store.ts
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
## Common Mistakes

### [HIGH] Partial set without merge

Wrong:

```ts
store.set({ count: 1 })
```

Correct:

```ts
store.set(prev => ({ ...prev, count: 1 }))
```

set replaces the whole validated object; partial objects fail schema validation.

### [HIGH] Non-Standard Schema validator

Wrong:

```ts
schema: (v) => v.count > 0
```

Correct:

```ts
schema: z.object({ count: z.number() })
```

validateSchema expects Standard Schema V1; plain functions throw.

### [MEDIUM] Ignoring onValidationError for repair

Wrong:

```ts
createSchemaStore({ schema, defaultValue })
```

Correct:

```ts
createSchemaStore({ schema, defaultValue, onValidationError: repairFn })
```

Without a handler, invalid data silently falls back to defaultValue.

## Source

`src/core/schema-store.ts`