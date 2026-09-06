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
        title: 'Seitu - Type-Safe Utilities',
      },
      {
        name: 'description',
        content:
          'Type-safe, framework-agnostic utilities for reactive values: stores, storage, media queries and more, with bindings for React, Vue, Solid and Svelte.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
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
