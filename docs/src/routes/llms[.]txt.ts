import { createFileRoute } from '@tanstack/react-router'
import { llms } from 'fumadocs-core/source/llms'

import { source } from '~/lib/source'

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () =>
        new Response(llms(source).index(), {
          headers: {
            'Content-Type': 'text/markdown',
          },
        }),
    },
  },
})
