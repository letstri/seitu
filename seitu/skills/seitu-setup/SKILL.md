---
name: seitu-setup
description: >-
  Adopt Seitu across an existing project: install it, find hand-rolled
  reactive state and browser subscriptions (localStorage/sessionStorage/cookie
  hooks, matchMedia, online status, scroll listeners, debounce/throttle
  helpers, small global stores), and replace them with Seitu primitives
  without losing persisted user data. Use when asked to set up Seitu, migrate
  a codebase to Seitu, or replace existing state or storage code with Seitu.
metadata:
  library: seitu
  library_version: "1.2.0"
---

# Seitu setup and migration

Moves an existing app onto Seitu in reviewable steps. Read **seitu-overview**
first for the mental model. For the exact options of each primitive, read the
matching file in the **seitu** skill's `references/` folder before you write
the replacement.

The goal is less code with the same behavior. A replacement that changes what
a user sees, or drops data they already stored, is a regression.

## Workflow

1. **Detect the stack.** Do this before you change anything.
2. **Install** `seitu` and, when needed, a schema library.
3. **Inventory** the candidates with the searches below.
4. **Classify** each candidate as replace, keep or ask.
5. **Show the plan** to the user and wait for approval.
6. **Migrate one category at a time.** Verify after each category.
7. **Delete** the code and dependencies that nothing uses anymore.

Do not rewrite the whole project in one pass. A category is one row of the
replacement table, for example "all localStorage hooks".

## 1. Detect the stack

Read `package.json` and the lockfile, and record:

| Question | Where to look | Why it matters |
|----------|---------------|----------------|
| Package manager | `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `package-lock.json` | Install command |
| Framework | `react`, `vue`, `solid-js`, `svelte` in dependencies | Binding import: `seitu/react`, `seitu/vue`, `seitu/solid`, `seitu/svelte` |
| Framework version | same | Seitu needs React >= 19, Vue >= 3.5, Solid >= 1.9, Svelte >= 5. Stop and tell the user if the project is older. |
| SSR | `next`, `nuxt`, `@tanstack/react-start`, `@sveltejs/kit`, `@solidjs/start`, `astro`, `remix`, `react-router` (framework mode) | `defaultMatches`, `createCookieValue` with `getServerCookies` |
| Schema library | `zod`, `valibot`, `arktype` | Storage primitives need a Standard Schema validator |
| Module format and Node | `"type"`, `engines` | Seitu is ESM-only and needs Node >= 22 |

A monorepo can use more than one framework. Pick the binding for each
package, not for the whole repository.

## 2. Install

```bash
pnpm add seitu        # or npm i / yarn add / bun add
```

The framework bindings ship inside `seitu`, so there are no extra packages.
The storage primitives need a Standard Schema validator. Reuse the project's
validator. If there is none, ask the user before you add one. Zod is the
default suggestion.

## 3. Inventory

Search source files only. Exclude `node_modules`, build output and generated
files.

```bash
rg -n "localStorage|sessionStorage" --glob '!**/node_modules/**'
rg -n "document\.cookie|js-cookie|universal-cookie|react-cookie" --glob '!**/node_modules/**'
rg -n "matchMedia|useMediaQuery|prefers-color-scheme" --glob '!**/node_modules/**'
rg -n "navigator\.onLine|'online'|'offline'" --glob '!**/node_modules/**'
rg -n "addEventListener\(['\"]scroll|onScroll|scrollTop|scrollLeft" --glob '!**/node_modules/**'
rg -n "debounce|throttle" --glob '!**/node_modules/**'
rg -n "useSyncExternalStore|createContext|new EventTarget|EventEmitter|mitt\(" --glob '!**/node_modules/**'
rg -n "indexedDB|idb-keyval|from 'idb'|localforage|dexie" --glob '!**/node_modules/**'
rg -n "zustand|jotai|nanostores|valtio|@vueuse/core|svelte/store" --glob '!**/node_modules/**'
```

For each hit, record the file, what the code does, who reads the value and
who writes it. Group the hits into categories from the table below.

## 4. Classify

### Replace

| Existing code | Seitu primitive | Reference |
|---------------|-----------------|-----------|
| `useLocalStorage` / `useSessionStorage` hook, `useStorage` from VueUse, `writable` + `localStorage.setItem` in Svelte | `createWebStorageValue` (one key), `createWebStorage` (several related keys) | `create-web-storage-value.md`, `create-web-storage.md` |
| Cookie read in SSR and written in the browser (theme, language, consent) | `createCookieValue` with `getServerCookies` | `create-cookie-value.md` |
| `useMediaQuery`, `matchMedia(...).addEventListener('change', ...)` | `createMediaQuery` | `create-media-query.md` |
| `navigator.onLine` with `online`/`offline` listeners | `createIsOnline` | `create-is-online.md` |
| Scroll listener that computes "at top", "at bottom" or distance to an edge | `createScrollState` | `create-scroll-state.md` |
| Module-level variable plus a listener set, `EventEmitter` or `mitt` used as a store | `createStore` | `create-store.md` |
| Small global store (zustand, nanostores, jotai atom, Svelte `writable`) with no middleware | `createStore`, or `createSchemaStore` when the value is validated | `create-store.md`, `create-schema-store.md` |
| React context that only shares one value and its setter | `createStore` at module scope + `useSubscription` | `react.md` |
| `useMemo` / `computed` / `derived` over values that are now Seitu handles | `createComputed` | `create-computed.md` |
| `lodash.debounce`, `lodash.throttle` or a hand-written timer whose result is shown in the UI | `createDebouncedFn`, `createThrottledFn` | `create-debounced-fn.md`, `create-throttled-fn.md` |
| Debounced copy of another reactive value (for example search input) | `createDebounced`, `createThrottled` | `create-debounced.md`, `create-throttled.md` |
| `idb-keyval`, `localforage` or raw `indexedDB` used as a key/value store | `createIndexedDb` + `createIndexedDbStorage` | `create-indexed-db.md`, `create-indexed-db-storage.md` |
| Raw `indexedDB` object stores with indexes and queries | `createIndexedDb` + `createIndexedDbTable` | `create-indexed-db-table.md` |
| Custom browser subscription (visibility, resize, clipboard, geolocation) | `createSubscription` + `createReadableSubscription` | `create-subscription.md`, `create-readable-subscription.md` |

### Keep

Do not replace these. List them in the plan with the reason.

- **Server state**: TanStack Query, SWR, Apollo, tRPC and RTK Query caches. Seitu does not fetch, cache or revalidate.
- **Form state**: React Hook Form, TanStack Form, Formik, VeeValidate.
- **Router state**: search params, route params.
- **Local UI state**: `useState` / `ref` / `$state` that only one component reads, such as an open menu or an input draft.
- **Stores with middleware or devtools** in use (Redux, zustand `persist` with migrations, `immer`, time travel). Replacing them changes behavior, so ask first.
- **`HttpOnly` cookies**: JavaScript cannot read or write them.
- **Debounce or throttle inside a library** that you do not own.

### Ask

Ask the user before you replace:

- A dependency that other packages in a monorepo also use.
- A store with more than about ten consumers.
- Any storage key whose stored shape you cannot prove from the code.
- A change that removes a public export of a package.

## 5. Show the plan

Before you edit files, give the user a short plan:

```md
Replace
- localStorage hooks (4 files): src/hooks/use-local-storage.ts -> createWebStorageValue
- matchMedia (2 files): src/hooks/use-media-query.ts -> createMediaQuery

Keep
- TanStack Query cache: server state
- src/features/editor/store.ts: zustand with persist migrations, ask before changing

New dependency
- seitu (and zod, not installed yet)
```

Wait for approval. Then migrate one category at a time.

## 6. Migrate

### Rules for every replacement

- **Create shared handles once, at module scope.** Put them next to the feature that owns them, for example `src/stores/theme.ts`. Do not create a handle inside a component body. When a handle depends on props, pass a factory to `useSubscription` with `deps`.
- **Keep the storage key.** Use the same `key` as the old code, so returning users keep their data.
- **Write a schema that accepts the stored data.** Seitu parses the stored string with `JSON.parse`. A value that is not valid JSON is read as a plain string. If validation fails, `get()` returns `defaultValue` and the stored value is overwritten on the next `set()`.
- **Match the old default.** Use the same fallback value the old code used.
- **Keep the SSR output.** If the old code rendered a value on the server, the new code must render the same value. Use `defaultMatches` for media queries. Use `createCookieValue` with `getServerCookies` for values the server must show.
- **Return new objects from updaters.** `set()` does not notify when the new value is the same reference.
- **Import the binding for the file's framework.** Do not import `seitu/react` in Vue, Solid or Svelte code.

### Stored data compatibility

Check the old write path for each key before you choose the schema:

| Old write | Stored string | Seitu reads | Schema |
|-----------|---------------|-------------|--------|
| `setItem('theme', 'dark')` | `dark` | `'dark'` | `z.enum(['light', 'dark'])` |
| `setItem('theme', JSON.stringify('dark'))` | `"dark"` | `'dark'` | same |
| `setItem('count', String(5))` | `5` | `5` (number) | `z.number()`, not `z.string()` |
| `setItem('id', '123')` where the id is a string | `123` | `123` (number) | `z.coerce.string()` or a union |
| `setItem('user', JSON.stringify(user))` | JSON object | object | object schema with the real shape |

When the stored shape changed between app versions, use `onValidationError`
to repair the value, or `repairValueObjectWithDefault` from `seitu/utils` for
objects that gained fields. Do not silently reset user data that you can
repair.

### Before and after

**localStorage hook (React)**

Before:

```tsx
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'light')
  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])
  return [theme, setTheme] as const
}
```

After:

```ts
// src/stores/theme.ts
import { createWebStorageValue } from 'seitu/web'
import * as z from 'zod'

export const theme = createWebStorageValue({
  type: 'localStorage',
  key: 'theme',
  schema: z.enum(['light', 'dark']),
  defaultValue: 'light',
})
```

```tsx
import { useSubscription } from 'seitu/react'
import { theme } from '~/stores/theme'

const value = useSubscription(theme)
theme.set('dark')
```

The old hook read `localStorage` during render, so it failed on the server and
did not sync across tabs. The new handle does both.

**Media query hook**

Before:

```ts
function useIsDesktop() {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return matches
}
```

After:

```ts
export const isDesktop = createMediaQuery({
  query: '(min-width: 1024px)',
  defaultMatches: false, // the old hook rendered false on the server
})
```

Consumers change from `useIsDesktop()` to `useSubscription(isDesktop)`.

**Global store with a listener set**

Before:

```ts
let count = 0
const listeners = new Set<() => void>()
export const counter = {
  get: () => count,
  inc: () => {
    count++
    listeners.forEach((l) => l())
  },
  subscribe: (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}
```

After:

```ts
export const counter = createStore(0)
counter.set((n) => n + 1)
```

**Vue: VueUse `useStorage`**

Before:

```ts
const token = useStorage('token', null)
```

After:

```ts
// stores/token.ts
export const token = createWebStorageValue({
  type: 'localStorage',
  key: 'token',
  schema: z.string().nullable(),
  defaultValue: null,
})
```

```ts
const value = useSubscription(token) // readonly ShallowRef, write with token.set()
```

Code that wrote `token.value = x` now calls `token.set(x)`.

**Svelte: `writable` persisted by hand**

Before:

```ts
export const lang = writable(localStorage.getItem('lang') ?? 'en')
lang.subscribe((v) => localStorage.setItem('lang', v))
```

After:

```ts
export const lang = createWebStorageValue({
  type: 'localStorage',
  key: 'lang',
  schema: z.enum(['en', 'de']),
  defaultValue: 'en',
})
```

```svelte
<script lang="ts">
  const value = useSubscription(lang)
</script>
<p>{$value}</p>
```

`$lang = 'de'` becomes `lang.set('de')`.

### Changing call sites

Keep a thin wrapper only when many files call the old API and the user wants a
small diff:

```ts
/** @deprecated Use useSubscription(theme) directly. */
export const useTheme = () => useSubscription(theme)
```

Otherwise update every call site and delete the old hook in the same step.

## 7. Verify and clean up

After each category:

1. Run the project's type check, tests and lint.
2. Build the app when it uses SSR, and check for hydration warnings.
3. Test the behavior in the browser when you can: a value survives a reload, two tabs stay in sync, a media query updates on resize.
4. Search again for the old pattern, so no call site is left behind.

At the end:

- Delete hooks, utils and types that nothing imports anymore.
- Remove dependencies that nothing imports anymore (`use-local-storage-state`, `js-cookie`, `lodash.debounce`, `idb-keyval`, `zustand` and similar). Check every package of a monorepo first.
- Report to the user what was replaced, what was kept and why, and any storage key whose schema you had to guess.

## Common Mistakes

### [CRITICAL] Renaming the storage key

Wrong:

```ts
createWebStorageValue({ type: 'localStorage', key: 'app:theme', ... }) // old key was 'theme'
```

Correct:

```ts
createWebStorageValue({ type: 'localStorage', key: 'theme', ... })
```

A new key starts every returning user from `defaultValue`.

### [CRITICAL] Schema stricter than the stored data

Wrong:

```ts
schema: z.string() // old code stored String(5), which Seitu reads as 5
```

Correct:

```ts
schema: z.number()
```

A failed validation returns `defaultValue` and the next `set()` overwrites the
stored value.

### [HIGH] Creating a handle inside a component

Wrong:

```tsx
function Toolbar() {
  const isDesktop = useSubscription(createMediaQuery({ query: '(min-width: 1024px)' }))
}
```

Correct:

```tsx
const isDesktop = createMediaQuery({ query: '(min-width: 1024px)' })
function Toolbar() {
  const matches = useSubscription(isDesktop)
}
```

### [HIGH] Replacing server state or form state

Seitu handles are not a fetch cache or a form library. Keep TanStack Query,
SWR, React Hook Form and similar tools.

### [HIGH] Migrating everything in one pass

Big rewrites hide regressions. Migrate one category, verify it, then continue.

### [MEDIUM] Keeping a `typeof window` guard around creation

Wrong:

```ts
const theme = typeof window !== 'undefined' ? createWebStorageValue({ ... }) : null
```

Correct:

```ts
const theme = createWebStorageValue({ ... })
```

Seitu web primitives return their defaults on the server.

## See also

- **seitu-overview**: module map, mental model, decision tree
- **seitu**: per-primitive options in `references/`
- Docs: https://seitu.letstri.dev/docs
