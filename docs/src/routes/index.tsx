import { createFileRoute, Link } from '@tanstack/react-router'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { HomeLayout } from 'fumadocs-ui/layouts/home'

import { baseOptions } from '~/lib/layout.shared'

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

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="min-h-screen">
        <div className="container mx-auto grid grid-cols-1 items-center gap-8 px-4 py-16 sm:gap-12 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div className="pt-6 text-center sm:pt-8 lg:order-1 lg:pt-12 lg:text-left">
            <h1 className="text-fd-foreground text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block">Seitu</span>
            </h1>
            <p className="text-fd-muted-foreground mx-auto mt-4 max-w-md text-base leading-relaxed sm:mt-5 sm:max-w-lg sm:text-lg lg:mx-0 lg:mt-6 lg:max-w-xl lg:text-xl">
              A type-safe, framework-agnostic library for working with familiar
              hooks. Use it with React or without any framework—typed, testable,
              and usable outside components.
            </p>
            <Link
              to="/docs/$"
              params={{ _splat: '' }}
              className="bg-fd-primary text-fd-primary-foreground focus:ring-fd-primary focus:ring-offset-fd-background mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:outline-none"
            >
              Documentation
              <svg
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
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
        </div>
      </div>
    </HomeLayout>
  )
}
