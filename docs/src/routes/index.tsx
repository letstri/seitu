import { createFileRoute, Link } from '@tanstack/react-router'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import {
  ArrowRightIcon,
  BlocksIcon,
  DatabaseIcon,
  MonitorSmartphoneIcon,
  PackageIcon,
  ServerIcon,
  ShieldCheckIcon,
  UnplugIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { baseOptions, githubUrl } from '~/lib/layout.shared'

export const Route = createFileRoute('/')({
  component: Home,
})

const initCode = `// Import needed function, e.g. local storage
import { createWebStorage } from 'seitu/web'
// Use any Standard Schema library you want
import * as z from 'zod'

// Create an instance of the function
const localStorage = createWebStorage({
  type: 'localStorage',
  schemas: { count: z.number(), name: z.string() },
  defaultValues: { count: 0, name: '' },
})`

const usageCode = `// Manipulate the instance
localStorage.get() // { count: 0, name: '' }
localStorage.set({ count: 1, name: 'John' })
localStorage.subscribe(console.log)
`

const reactCode = `// Import framework hook to subscribe to the function output
import { useSubscription } from 'seitu/react'

export default function Page() {
  // Subscribe to the instance
  const count = useSubscription(
    localStorage,
    // Re-render only when count changes
    { selector: value => value.count }
  )

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => count.set(c => c + 1)}>Increment</button>
    </div>
  )
}
`

const contractCode = `const value = createStore(0) // or storage, media query, scroll state…

value.get() // read anywhere, no component needed
value.set(v => v + 1) // write, sync or async
value.subscribe(console.log) // listen, returns an unsubscribe
`

const features = [
  {
    icon: UnplugIcon,
    title: 'One contract',
    description:
      'Every primitive returns the same handle: get(), set() and subscribe(). Learn it once, use it for state, storage and browser APIs.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Validated by your schema',
    description:
      'Pass any Standard Schema validator — Zod, Valibot, ArkType. Stored data is parsed on read and write, and falls back to your defaults.',
  },
  {
    icon: BlocksIcon,
    title: 'Usable outside components',
    description:
      'Primitives live at module scope, so utilities, event handlers and tests read the same value your components render.',
  },
  {
    icon: ServerIcon,
    title: 'SSR-safe',
    description:
      'Browser APIs are touched only after mount, so servers get your default values instead of a hydration mismatch.',
  },
  {
    icon: MonitorSmartphoneIcon,
    title: 'Framework bindings',
    description:
      'A useSubscription hook, composable or rune for React, Vue, Solid and Svelte — with selectors to skip needless re-renders.',
  },
  {
    icon: PackageIcon,
    title: 'Import only what you use',
    description:
      'Entry points per area and per feature: seitu/web for everything browser, seitu/web/web-storage for just one.',
  },
]

const primitives = [
  {
    icon: BlocksIcon,
    title: 'Core',
    href: '/docs/core/store',
    description:
      'Stores, schema stores, computed values, debounce and throttle.',
    items: [
      'createStore',
      'createSchemaStore',
      'createComputed',
      'createDebounced',
    ],
  },
  {
    icon: DatabaseIcon,
    title: 'Web',
    href: '/docs/web/web-storage',
    description:
      'Typed browser storage and DOM state, validated on every read.',
    items: [
      'createWebStorage',
      'createIndexedDb',
      'createMediaQuery',
      'createScrollState',
    ],
  },
]

const frameworks = [
  { name: 'React', href: '/docs/react/hooks' },
  { name: 'Vue', href: '/docs/vue/composables' },
  { name: 'Solid', href: '/docs/solid/hooks' },
  { name: 'Svelte', href: '/docs/svelte/hooks' },
  { name: 'No framework', href: '/docs/core/subscription' },
]

function DocsLink({
  children,
  className,
  splat = '',
}: {
  children: ReactNode
  className?: string
  splat?: string
}) {
  return (
    <Link to="/docs/$" params={{ _splat: splat }} className={className}>
      {children}
    </Link>
  )
}

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="flex flex-1 flex-col">
        <section className="container mx-auto grid grid-cols-1 items-center gap-8 px-4 py-16 sm:gap-12 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div className="pt-6 text-center sm:pt-8 lg:order-1 lg:pt-12 lg:text-left">
            <h1 className="text-fd-foreground text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block">Seitu</span>
            </h1>
            <p className="text-fd-muted-foreground mx-auto mt-4 max-w-md text-base leading-relaxed sm:mt-5 sm:max-w-lg sm:text-lg lg:mx-0 lg:mt-6 lg:max-w-xl lg:text-xl">
              Type-safe reactive primitives with one contract: get(), set(),
              subscribe(). In-memory state, validated localStorage and
              IndexedDB, media queries and scroll position — inside components
              or far away from them.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <DocsLink className="bg-fd-primary text-fd-primary-foreground focus:ring-fd-primary focus:ring-offset-fd-background inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:outline-none sm:w-auto">
                Documentation
                <ArrowRightIcon className="size-4 shrink-0" />
              </DocsLink>
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="border-fd-border text-fd-foreground hover:bg-fd-accent hover:text-fd-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium transition-colors sm:w-auto"
              >
                GitHub
              </a>
            </div>
            <div className="mx-auto mt-6 max-w-md text-left lg:mx-0">
              <DynamicCodeBlock lang="bash" code="pnpm add seitu" />
            </div>
          </div>
          <div className="w-full min-w-0 lg:order-2">
            <Tabs items={['Init', 'Usage', 'Framework']}>
              <Tab value="Init">
                <DynamicCodeBlock lang="ts" code={initCode} />
              </Tab>
              <Tab value="Usage">
                <DynamicCodeBlock lang="ts" code={usageCode} />
              </Tab>
              <Tab value="Framework">
                <DynamicCodeBlock lang="tsx" code={reactCode} />
              </Tab>
            </Tabs>
          </div>
        </section>

        <section className="border-fd-border border-t">
          <div className="container mx-auto grid grid-cols-1 items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div>
              <h2 className="text-fd-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                Learn one API, use it everywhere
              </h2>
              <p className="text-fd-muted-foreground mt-4 text-base leading-relaxed">
                A store, a validated <code>localStorage</code> key, an IndexedDB
                table and a media query all hand you the same three methods.
                Swap the source without rewriting the code around it.
              </p>
            </div>
            <DynamicCodeBlock lang="ts" code={contractCode} />
          </div>
        </section>

        <section className="border-fd-border border-t">
          <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="border-fd-border bg-fd-card rounded-xl border p-5"
                >
                  <Icon className="text-fd-primary size-5" />
                  <h3 className="text-fd-foreground mt-3 font-semibold">
                    {title}
                  </h3>
                  <p className="text-fd-muted-foreground mt-2 text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-fd-border border-t">
          <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-fd-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              Primitives
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {primitives.map(
                ({ icon: Icon, title, href, description, items }) => (
                  <DocsLink
                    key={title}
                    splat={href.replace('/docs/', '')}
                    className="border-fd-border bg-fd-card hover:bg-fd-accent rounded-xl border p-5 transition-colors"
                  >
                    <Icon className="text-fd-primary size-5" />
                    <h3 className="text-fd-foreground mt-3 font-semibold">
                      {title}
                    </h3>
                    <p className="text-fd-muted-foreground mt-2 text-sm leading-relaxed">
                      {description}
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {items.map((item) => (
                        <li
                          key={item}
                          className="border-fd-border text-fd-muted-foreground rounded-md border px-2 py-1 font-mono text-xs"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </DocsLink>
                )
              )}
            </div>
          </div>
        </section>

        <section className="border-fd-border border-t">
          <div className="container mx-auto px-4 py-16 text-center sm:px-6 lg:px-8">
            <h2 className="text-fd-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              Pick your framework
            </h2>
            <p className="text-fd-muted-foreground mx-auto mt-4 max-w-xl text-base leading-relaxed">
              The primitives never change. Only the way you subscribe to them
              does.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {frameworks.map(({ name, href }) => (
                <DocsLink
                  key={name}
                  splat={href.replace('/docs/', '')}
                  className="border-fd-border text-fd-foreground hover:bg-fd-accent hover:text-fd-accent-foreground inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                >
                  {name}
                </DocsLink>
              ))}
            </div>
            <DocsLink className="bg-fd-primary text-fd-primary-foreground focus:ring-fd-primary focus:ring-offset-fd-background mt-10 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:outline-none">
              Read the docs
              <ArrowRightIcon className="size-4 shrink-0" />
            </DocsLink>
          </div>
        </section>
      </main>
    </HomeLayout>
  )
}
