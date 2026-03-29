import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
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
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <Analytics />
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  )
}
