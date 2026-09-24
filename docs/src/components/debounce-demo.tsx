import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { createDebounced, createStore } from 'seitu'
import { useSubscription } from 'seitu/react'

const query = createStore('')
const debouncedQuery = createDebounced(query, 300)

const code = `const query = createStore('')
const debouncedQuery = createDebounced(query, 300)

// Re-renders 300 ms after typing stops
const value = useSubscription(debouncedQuery)`

function Row({ name, value }: { name: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-3 font-mono text-xs">
      <span className="text-fd-muted-foreground">{name}</span>
      <span className="truncate">{JSON.stringify(value)}</span>
    </p>
  )
}

export function DebounceDemo() {
  const raw = useSubscription(query)
  const debounced = useSubscription(debouncedQuery)

  return (
    <div className="surface divide-fd-border grid grid-cols-1 divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      <div className="bare-code min-w-0 [&_pre]:text-xs">
        <DynamicCodeBlock
          lang="ts"
          code={code}
          codeblock={{ allowCopy: false }}
        />
      </div>
      <div className="space-y-3 p-3">
        <input
          type="text"
          value={raw}
          onChange={(event) => query.set(event.target.value)}
          placeholder="Type to search…"
          aria-label="Search query"
          className="bg-fd-popover ring-fd-foreground/4 placeholder:text-fd-muted-foreground focus-visible:focus-ring h-8 w-full rounded-xl px-2.5 text-sm shadow-xs ring outline-none"
        />
        <div className="space-y-1">
          <Row name="query.get()" value={raw} />
          <Row name="debouncedQuery.get()" value={debounced} />
        </div>
      </div>
    </div>
  )
}
