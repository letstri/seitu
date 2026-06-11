# Seitu Cursor skills (for application developers)

These skills teach AI assistants how to integrate [Seitu](https://seitu.letstri.dev) in **your** app — not how to work on the Seitu library monorepo.

Seitu is a type-safe reactive primitives library. Framework-agnostic core with React and Vue bindings. Every primitive shares the same `get()` / `subscribe()` API — no actions, no reducers, no context providers.

## Install in your project

Copy the skill folders into your app's `.cursor/skills/` directory:

```bash
# From a clone of the seitu repo
cp -r /path/to/seitu/skills/* /path/to/your-app/.cursor/skills/
```

Or install only what you need:

```bash
cp -r /path/to/seitu/skills/seitu-overview /path/to/your-app/.cursor/skills/
cp -r /path/to/seitu/skills/createWebStorageValue /path/to/your-app/.cursor/skills/
cp -r /path/to/seitu/skills/useSubscription-react /path/to/your-app/.cursor/skills/
```

Restart Cursor or start a new agent chat so skills are picked up.

## Skills

Start with [seitu-overview](./seitu-overview/SKILL.md) — it covers the module map, mental model, and a decision tree for picking the right primitive.

### Core (`seitu`)

| Skill | When to use |
|-------|-------------|
| [createStore](./createStore/SKILL.md) | Simple in-memory reactive state |
| [createSchemaStore](./createSchemaStore/SKILL.md) | Schema-validated state (Zod, Valibot, ArkType) |
| [createComputed](./createComputed/SKILL.md) | Derived read-only values from one or many sources |
| [createDebounced](./createDebounced/SKILL.md) | Debounce updates from a source subscribable |
| [createThrottled](./createThrottled/SKILL.md) | Throttle updates from a source subscribable |
| [createDebouncedFn](./createDebouncedFn/SKILL.md) | Debounced function with reactive return value |
| [createThrottledFn](./createThrottledFn/SKILL.md) | Throttled function with reactive return value |
| [createSubscription](./createSubscription/SKILL.md) | Low-level subscribe/notify for custom primitives |
| [createReadableSubscription](./createReadableSubscription/SKILL.md) | Compose `get` + `subscribe` + `notify` into a standard interface |

### Web (`seitu/web`)

| Skill | When to use |
|-------|-------------|
| [createWebStorageValue](./createWebStorageValue/SKILL.md) | Single-key localStorage / sessionStorage |
| [createWebStorage](./createWebStorage/SKILL.md) | Multi-key localStorage / sessionStorage |
| [createIndexedDbStorage](./createIndexedDbStorage/SKILL.md) | Large or async persisted state in IndexedDB |
| [createMediaQuery](./createMediaQuery/SKILL.md) | Reactive CSS media query matches |
| [createIsOnline](./createIsOnline/SKILL.md) | Reactive online / offline status |
| [createScrollState](./createScrollState/SKILL.md) | Scroll position, edges, and remaining distance |

### React (`seitu/react`)

| Skill | When to use |
|-------|-------------|
| [useSubscription-react](./useSubscription-react/SKILL.md) | Hook for subscribing to any Seitu primitive |
| [Subscription-react](./Subscription-react/SKILL.md) | Render-prop component alternative to the hook |

### Vue (`seitu/vue`)

| Skill | When to use |
|-------|-------------|
| [useSubscription-vue](./useSubscription-vue/SKILL.md) | Composable for subscribing to any Seitu primitive |

## Without skills

- Official docs: https://seitu.letstri.dev/docs
- LLM-oriented exports: https://seitu.letstri.dev/llms.txt and https://seitu.letstri.dev/llms-full.txt

Examples: https://github.com/letstri/seitu/tree/main/playground
