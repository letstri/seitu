# createCookieValue

Single-key reactive handle for one cookie. The cookie is the storage, so the
server and the browser read the same value: SSR renders the visitor's choice
and hydration matches it.

## Usage

```ts
import { createCookieValue } from 'seitu/web'
import * as z from 'zod'

const theme = createCookieValue({
  key: 'theme',
  schema: z.enum(['light', 'dark']),
  defaultValue: 'light',
})

theme.get()
theme.set('dark')
theme.set(v => (v === 'dark' ? 'light' : 'dark'))
theme.clear()
```

## SSR

Pass `getServerCookies` so the server reads the request's `Cookie` header.
Seitu cannot know the framework, so the app supplies the reader.

```ts
// TanStack Start
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

const theme = createCookieValue({
  key: 'theme',
  schema: z.enum(['light', 'dark']),
  defaultValue: 'light',
  getServerCookies: createIsomorphicFn().server(() => getRequestHeader('cookie')),
})
```

```ts
// Next.js
import { cookies } from 'next/headers'

const theme = createCookieValue({
  key: 'theme',
  schema: z.enum(['light', 'dark']),
  defaultValue: 'light',
  getServerCookies: () =>
    cookies().getAll().map(({ name, value }) => `${name}=${value}`).join('; '),
})
```

`set` and `clear` are no-ops on the server; sending `Set-Cookie` is the
framework's job.

## Options

| Option | Type | Description |
|--------|------|-------------|
| `key` | `string` | Cookie name |
| `schema` | `StandardSchemaV1` | Validator |
| `defaultValue` | inferred | Fallback when the cookie is missing or invalid |
| `onValidationError?` | `(props) => void \| value` | Handle invalid data |
| `getServerCookies?` | `() => string \| null \| undefined` | Request `Cookie` header, read on the server |
| `attributes?` | `CookieAttributes` | `path` (`/`), `domain`, `maxAge` (400 days), `expires`, `sameSite` (`lax`), `secure`, `partitioned` |

## Interface

```ts
interface CookieValue<V> extends Subscribable<V>, ServerReadable<V>, Writable<V>, Clearable {}
```

Cross-tab sync via `cookieStore` change events, or a `BroadcastChannel`
fallback, while subscribed.

## Common Mistakes

### [HIGH] Using it for data instead of small preferences

Cookies travel with every request and the encoded `name=value` pair must stay
under 4 KB (bigger writes are skipped with a warning). Keep a language, theme,
or a short id in a cookie; put data in `createWebStorageValue` or IndexedDB.

### [HIGH] Expecting to read an `HttpOnly` cookie

`HttpOnly` cookies are invisible to JavaScript: `get()` returns `defaultValue`
in the browser, and `set` cannot replace them.

### [MEDIUM] Omitting `getServerCookies` in an SSR app

Without it the server renders `defaultValue`, and the hydrated tree switches to
the cookie value after mount. Pass the reader whenever server HTML must show
the visitor's choice.

### [CRITICAL] Creating new instance per render in React

Wrong:

```ts
useSubscription(createCookieValue({ key: 'x', ... }))
```

Correct:

```ts
const theme = createCookieValue({ key: 'x', ... })
useSubscription(theme)
```

## Source

`src/web/cookie-value/index.ts`
