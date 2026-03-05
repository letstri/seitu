import { createFileRoute, Link } from '@tanstack/react-router'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { baseOptions } from '~/lib/layout.shared'

export const Route = createFileRoute('/')({
  component: Home,
})

const initCode = `// Import needed function, e.g. local storage
import { createLocalStorage } from 'seitu/web'
// Use any Standard Schema library you want
import * as z from 'zod'

// Create an instance of the function
const localStorage = createLocalStorage({
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
  const { value: count } = useSubscription(
    localStorage,
    // Re-render only when count changes
    { selector: value => value.count }
  )

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => value.set(c => c + 1)}>Increment</button>
    </div>
  )
}
`

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="min-h-screen">
        <div className="container grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 mx-auto px-4 sm:px-6 lg:px-8 py-16 items-center">
          <div className="pt-6 sm:pt-8 lg:pt-12 lg:order-1 text-center lg:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-fd-foreground">
              <span className="block">Seitu</span>
            </h1>
            <p className="mt-4 sm:mt-5 lg:mt-6 max-w-md sm:max-w-lg lg:max-w-xl mx-auto lg:mx-0 text-base sm:text-lg lg:text-xl text-fd-muted-foreground leading-relaxed">
              A type-safe, framework-agnostic library for working with familiar hooks. Use it with
              React or without any framework—typed, testable, and usable outside components.
            </p>
            <Link
              to="/docs/$"
              params={{ _splat: '' }}
              className="mt-8 inline-flex items-center gap-2 justify-center px-5 py-3 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-fd-primary focus:ring-offset-2 focus:ring-offset-fd-background"
            >
              Documentation
              <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="lg:order-2 w-full min-w-0">
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
        </div>
      </div>
    </HomeLayout>
  )
}
