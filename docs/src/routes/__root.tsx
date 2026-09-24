import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { Analytics } from '@vercel/analytics/react'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'

import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Seitu — one contract for every reactive value',
      },
      {
        name: 'description',
        content:
          'Type-safe reactive primitives that share one API: get(), set(), subscribe(). Stores, validated storage, IndexedDB, cookies and browser state for React, Vue, Solid and Svelte — with agent skills in the npm package.',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400..600&family=Geist+Mono:wght@400..500&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <Analytics />
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  )
}
