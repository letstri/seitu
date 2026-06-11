---
name: createWebStorage
description: >-
  Create a multi-key reactive handle for localStorage/sessionStorage with schema
  validation. Use when persisting multiple keys to web storage with Seitu.
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

## Source

`seitu/src/web/web-storage.ts`
