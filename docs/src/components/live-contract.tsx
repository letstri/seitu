import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { useEffect, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { createStore } from 'seitu'
import type { Readable, Subscribable } from 'seitu'
import { useSubscription } from 'seitu/react'
import {
  createIsOnline,
  createMediaQuery,
  createWebStorageValue,
} from 'seitu/web'
import * as z from 'zod'

type Handle = Readable<unknown> & Subscribable<unknown>

interface Source {
  id: string
  label: string
  kind: string
  create: string
  handle: Handle
  // Present only on writable handles; read-only ones are driven by the browser.
  set?: () => void
  hint: string
}

const counter = createStore(0)
const clicks = createWebStorageValue({
  type: 'localStorage',
  key: 'seitu-demo-clicks',
  defaultValue: 0,
  schema: z.number(),
})
const wide = createMediaQuery({ query: '(min-width: 1024px)' })
const online = createIsOnline()

const sources: Source[] = [
  {
    id: 'store',
    label: 'Store',
    kind: 'in-memory',
    create: 'const value = createStore(0)',
    handle: counter,
    set: () => counter.set((n) => n + 1),
    hint: 'Module scope · no component needed',
  },
  {
    id: 'storage',
    label: 'localStorage',
    kind: 'persisted',
    create: `const value = createWebStorageValue({
  type: 'localStorage', key: 'seitu-demo-clicks',
  schema: z.number(), defaultValue: 0,
})`,
    handle: clicks,
    set: () => clicks.set((n) => n + 1),
    hint: 'Validated by Zod · survives reloads',
  },
  {
    id: 'media',
    label: 'Media query',
    kind: 'browser',
    create: `const value = createMediaQuery({ query: '(min-width: 1024px)' })`,
    handle: wide,
    hint: 'Read-only · resize across 1024px',
  },
  {
    id: 'online',
    label: 'Online',
    kind: 'browser',
    create: 'const value = createIsOnline()',
    handle: online,
    hint: 'Read-only · go offline in DevTools',
  },
]

interface Entry {
  id: number
  value: string
  at: string
}

const format = (value: unknown) => JSON.stringify(value)
const time = () => {
  const now = new Date()
  return `${now.toLocaleTimeString('en-GB', { hour12: false })}.${String(now.getMilliseconds()).padStart(3, '0')}`
}

let nextId = 0

/** Arrow, Home and End keys move selection and focus between tabs (WAI-ARIA tabs pattern). */
export function onTabListKeyDown<T>(
  event: KeyboardEvent<HTMLElement>,
  items: readonly T[],
  current: T,
  select: (item: T) => void
) {
  const index = items.indexOf(current)
  const moves: Record<string, number> = {
    ArrowRight: index + 1,
    ArrowLeft: index - 1,
    Home: 0,
    End: items.length - 1,
  }
  const target = moves[event.key]
  if (target === undefined) {
    return
  }
  event.preventDefault()
  const next = (target + items.length) % items.length
  select(items[next]!)
  event.currentTarget
    .closest('[role="tablist"]')
    ?.querySelectorAll<HTMLElement>('[role="tab"]')
    [next]?.focus()
}

function Step({
  label,
  meta,
  children,
}: {
  label: string
  meta?: string
  children: ReactNode
}) {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow">{label}</span>
        {meta && (
          <span className="text-fd-muted-foreground text-2xs truncate">
            {meta}
          </span>
        )}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export function LiveContract() {
  const [active, setActive] = useState(sources[0]!)
  const value = useSubscription(active.handle)
  const [last, setLast] = useState<Entry | null>(null)
  const select = (source: Source) => {
    setActive(source)
    setLast(null)
  }

  useEffect(() => {
    return active.handle.subscribe((next) => {
      setLast({ id: nextId++, value: format(next), at: time() })
    })
  }, [active])

  return (
    <div className="surface divide-fd-border divide-y">
      <Step label="Create" meta={active.kind}>
        <div
          role="tablist"
          aria-label="Source"
          className="bg-fd-foreground/5 inline-flex flex-wrap gap-0.5 rounded-lg p-0.5"
        >
          {sources.map((source) => (
            <button
              key={source.id}
              id={`source-tab-${source.id}`}
              role="tab"
              type="button"
              aria-selected={source.id === active.id}
              aria-controls="source-panel"
              tabIndex={source.id === active.id ? 0 : -1}
              onKeyDown={(event) =>
                onTabListKeyDown(event, sources, active, select)
              }
              onClick={() => select(source)}
              className="text-fd-muted-foreground hover:text-fd-foreground aria-selected:bg-fd-popover aria-selected:text-fd-foreground aria-selected:ring-fd-foreground/4 focus-visible:focus-ring h-6 cursor-default rounded-md px-2.5 text-xs outline-none aria-selected:shadow-xs aria-selected:ring"
            >
              {source.label}
            </button>
          ))}
        </div>
        {/* Tall enough for the longest snippet, so switching never shifts the layout. */}
        <div
          key={active.id}
          id="source-panel"
          role="tabpanel"
          aria-labelledby={`source-tab-${active.id}`}
          className="swap bare-code -mx-3 -mb-3 min-h-24 [&_pre]:text-xs"
        >
          <DynamicCodeBlock
            lang="ts"
            code={active.create}
            codeblock={{ allowCopy: false }}
          />
        </div>
      </Step>

      <Step label="Get · set" meta={active.set ? 'writable' : 'read-only'}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm">
              value.get() <span className="text-fd-muted-foreground">→</span>{' '}
              <span className="text-fd-primary tabular-nums">
                {format(value)}
              </span>
            </p>
            <p className="text-fd-muted-foreground mt-0.5 text-xs">
              {active.hint}
            </p>
          </div>
          {active.set ? (
            <button
              type="button"
              onClick={active.set}
              className="btn btn-outline btn-xs font-mono"
            >
              set(n =&gt; n + 1)
            </button>
          ) : (
            <span className="text-fd-muted-foreground shrink-0 font-mono text-xs line-through">
              set()
            </span>
          )}
        </div>
      </Step>

      <Step label="Subscribe" meta="last notify">
        <p aria-live="polite" className="font-mono text-xs">
          {last ? (
            <span
              key={last.id}
              className="blip -mx-1.5 flex items-center justify-between gap-3 rounded-md px-1.5 py-0.5"
            >
              <span className="text-fd-primary">→ {last.value}</span>
              <span className="text-fd-muted-foreground text-2xs tabular-nums">
                {last.at}
              </span>
            </span>
          ) : (
            <span className="text-fd-muted-foreground block py-0.5">
              waiting for notify()…
            </span>
          )}
        </p>
      </Step>
    </div>
  )
}
