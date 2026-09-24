import { createFileRoute, Link } from '@tanstack/react-router'
import { useSearchContext } from 'fumadocs-ui/contexts/search'
import { ArrowRightIcon, CheckIcon, CopyIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { DebounceDemo } from '~/components/debounce-demo'
import { LiveContract } from '~/components/live-contract'
import { githubUrl } from '~/lib/layout.shared'

export const Route = createFileRoute('/')({
  component: Home,
})

const highlights = [
  {
    title: 'Validated by your schema',
    body: 'Zod, Valibot or ArkType — any Standard Schema. Bad stored data falls back to your defaults.',
  },
  {
    title: 'SSR-safe by default',
    body: 'Browser APIs are touched only on the client. Servers render your defaults, so hydration matches.',
  },
  {
    title: 'Import only what you use',
    body: 'No framework in core. Entry points per area and per primitive keep bundles small.',
  },
]

const agentLines = [
  ['seitu-overview', 'module map, mental model, SSR'],
  ['seitu', 'per-primitive API, common mistakes'],
  ['seitu-setup', 'migrate an existing project'],
  ['/llms.txt', 'index of every docs page'],
  ['/docs/<page>.mdx', 'any page as plain Markdown'],
]

const navLinks = [
  { text: 'Docs', splat: '' },
  { text: 'Primitives', splat: 'core/store' },
  { text: 'AI agents', splat: 'ai-agents' },
  { text: 'Extend', splat: 'custom-primitives' },
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

function useCopy() {
  const [copied, setCopied] = useState(false)
  return {
    copied,
    copy: (text: string) => {
      void navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    },
  }
}

function CopyIconButton({ text }: { text: string }) {
  const { copied, copy } = useCopy()
  const label = copied ? 'Copied' : 'Copy'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => copy(text)}
      className="btn btn-ghost btn-icon-xs"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

function CommandPill({
  text,
  prompt = true,
  size = 'default',
}: {
  text: string
  prompt?: boolean
  size?: 'default' | 'lg'
}) {
  return (
    <div
      className={`surface flex items-center gap-2 ps-3 pe-1 ${size === 'lg' ? 'h-9' : 'h-8'}`}
    >
      <code className="min-w-0 flex-1 truncate font-mono text-xs">
        {prompt && (
          <span className="text-fd-muted-foreground select-none">$ </span>
        )}
        {text}
      </code>
      <CopyIconButton text={text} />
    </div>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="bg-fd-muted text-fd-foreground rounded-md px-1 py-px font-mono text-sm">
      {children}
    </code>
  )
}

function Section({ children }: { children: ReactNode }) {
  return (
    <section className="border-fd-border border-t">
      <div className="frame py-14 lg:py-20">{children}</div>
    </section>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
      {children}
    </h2>
  )
}

function Panel({
  title,
  meta,
  children,
}: {
  title: string
  meta: ReactNode
  children: ReactNode
}) {
  return (
    <div className="surface min-w-0 overflow-hidden">
      <div className="border-fd-border flex h-8 items-center justify-between border-b ps-3 pe-1">
        <span className="text-fd-muted-foreground font-mono text-xs">
          {title}
        </span>
        {meta}
      </div>
      {children}
    </div>
  )
}

function Header() {
  const { setOpenSearch } = useSearchContext()
  return (
    <header className="border-fd-border bg-fd-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="frame flex h-12 items-center gap-4">
        <Link to="/" className="flex cursor-default items-center gap-2">
          <Logo />
          <span className="text-base font-semibold tracking-tight">Seitu</span>
        </Link>
        <nav className="hidden items-center md:flex">
          {navLinks.map(({ text, splat }) => (
            <DocsLink key={text} splat={splat} className="btn btn-ghost">
              {text}
            </DocsLink>
          ))}
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-ghost"
          >
            GitHub
          </a>
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Search docs"
            onClick={() => setOpenSearch(true)}
            className="btn btn-outline text-fd-muted-foreground px-2.5 sm:w-44 sm:justify-start"
          >
            <SearchIcon />
            <span className="hidden sm:inline">Search</span>
            <kbd className="bg-fd-foreground/5 text-2xs ms-auto hidden rounded-md px-1 font-sans font-medium sm:inline">
              ⌘K
            </kbd>
          </button>
          <DocsLink className="btn btn-default">Get started</DocsLink>
        </div>
      </div>
    </header>
  )
}

function Logo() {
  // Three bars: get, set, subscribe.
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="text-fd-primary size-5">
      <rect x="3" y="5" width="18" height="3.2" rx="1.6" fill="currentColor" />
      <rect
        x="3"
        y="10.4"
        width="12"
        height="3.2"
        rx="1.6"
        fill="currentColor"
        opacity="0.7"
      />
      <rect
        x="3"
        y="15.8"
        width="15"
        height="3.2"
        rx="1.6"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  )
}

const steps = [
  {
    title: 'Add the package',
    body: 'One dependency. Bindings ship inside it.',
    code: 'pnpm add seitu',
  },
  {
    title: 'Create a handle',
    body: 'At module scope, so any file can import it.',
    code: 'const counter = createStore(0)',
  },
  {
    title: 'Read it in a component',
    body: 'From seitu/react, /vue, /solid or /svelte.',
    code: 'useSubscription(counter)',
  },
]

const footerLinks = [
  {
    title: 'Docs',
    links: [
      ['Introduction', ''],
      ['AI agents', 'ai-agents'],
      ['Custom primitives', 'custom-primitives'],
    ],
  },
  {
    title: 'Primitives',
    links: [
      ['Core', 'core/store'],
      ['Web', 'web/web-storage'],
      ['Subscription', 'core/subscription'],
    ],
  },
  {
    title: 'Frameworks',
    links: [
      ['React', 'react/hooks'],
      ['Vue', 'vue/composables'],
      ['Solid', 'solid/hooks'],
      ['Svelte', 'svelte/hooks'],
    ],
  },
]

function Home() {
  return (
    <div className="bg-fd-background text-fd-foreground flex min-h-screen flex-col">
      <Header />

      <main className="w-full">
        {/* Hero: the thesis, and the proof running live next to it. */}
        <section className="frame grid grid-cols-1 items-center gap-10 py-14 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow">Reactive primitives for TypeScript</p>
            <h1 className="mt-3 text-4xl font-medium tracking-tight text-balance sm:text-5xl">
              One contract for every value
            </h1>
            <p className="text-fd-muted-foreground mt-5 max-w-md text-base leading-relaxed">
              Stores, localStorage, cookies, IndexedDB and media queries all
              share <Code>get</Code> and <Code>subscribe</Code>, plus{' '}
              <Code>set</Code> wherever a value is writable. Learn it once. So
              does your AI agent.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <DocsLink className="btn btn-default btn-lg">
                Read the docs
                <ArrowRightIcon />
              </DocsLink>
              <div className="sm:w-52">
                <CommandPill text="pnpm add seitu" size="lg" />
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <LiveContract />
          </div>
        </section>

        <section className="border-fd-border border-t">
          <dl className="frame grid grid-cols-1 gap-6 py-10 md:grid-cols-3 md:gap-10">
            {highlights.map(({ title, body }) => (
              <div key={title}>
                <dt className="text-sm font-medium">{title}</dt>
                <dd className="text-fd-muted-foreground mt-1 text-sm leading-relaxed">
                  {body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <Section>
          <SectionTitle>Debouncing is one more handle</SectionTitle>
          <p className="text-fd-muted-foreground mt-4 max-w-xl text-base leading-relaxed">
            Wrap any source with <Code>createDebounced</Code> and read it like
            the original. No effects, timers or cleanup in your components.
          </p>
          <div className="mt-8">
            <DebounceDemo />
          </div>
        </Section>

        <Section>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionTitle>
                Predictable for people. Obvious to agents.
              </SectionTitle>
              <p className="text-fd-muted-foreground mt-4 max-w-md text-base leading-relaxed">
                Coding agents get small, uniform APIs right. Seitu ships skills
                with the package and every docs page as Markdown, so your agent
                reads the API of the version you installed.
              </p>
              <DocsLink splat="ai-agents" className="btn btn-outline mt-6">
                Set up your agent
                <ArrowRightIcon />
              </DocsLink>
            </div>
            <Panel
              title="terminal"
              meta={<CopyIconButton text="npx skills add letstri/seitu" />}
            >
              <div className="overflow-x-auto p-3 font-mono text-xs leading-6">
                <p className="break-words">
                  <span className="text-fd-muted-foreground select-none">
                    ${' '}
                  </span>
                  npx skills add letstri/seitu
                </p>
                <p className="text-fd-muted-foreground mt-2">
                  # what your agent can read
                </p>
                {agentLines.map(([name, desc]) => (
                  <p key={name} className="flex flex-col sm:flex-row sm:gap-4">
                    <span className="shrink-0 sm:w-36">{name}</span>
                    <span className="text-fd-muted-foreground">{desc}</span>
                  </p>
                ))}
              </div>
            </Panel>
          </div>
        </Section>

        <Section>
          <SectionTitle>
            From install to a live value in three steps
          </SectionTitle>
          <ol className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            {steps.map(({ title, body, code }, i) => (
              <li key={title}>
                <h3 className="text-sm font-medium">
                  <span className="text-fd-muted-foreground me-2 tabular-nums">
                    {i + 1}
                  </span>
                  {title}
                </h3>
                <p className="text-fd-muted-foreground mt-1 mb-4 text-sm">
                  {body}
                </p>
                <CommandPill text={code} prompt={i === 0} />
              </li>
            ))}
          </ol>
        </Section>
      </main>

      <footer className="border-fd-border border-t">
        <div className="frame flex flex-col gap-8 py-10 md:flex-row md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-base font-semibold tracking-tight">
                Seitu
              </span>
            </div>
            <p className="text-fd-muted-foreground mt-2 text-sm">
              MIT licensed.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-3">
            {footerLinks.map(({ title, links }) => (
              <div key={title}>
                <p className="eyebrow">{title}</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {links.map(([text, splat]) => (
                    <li key={text}>
                      <DocsLink
                        splat={splat}
                        className="text-fd-muted-foreground hover:text-fd-foreground cursor-default transition-colors"
                      >
                        {text}
                      </DocsLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
