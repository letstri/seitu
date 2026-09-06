import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useFumadocsLoader } from 'fumadocs-core/source/client'
import browserCollections from 'fumadocs-mdx:collections/browser'
import * as Twoslash from 'fumadocs-twoslash/ui'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Suspense } from 'react'

import { baseOptions, gitConfig, githubUrl } from '~/lib/layout.shared'
import { source } from '~/lib/source'

const serverLoader = createServerFn({
  method: 'GET',
})
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs)
    if (!page) {
      throw notFound()
    }

    return {
      url: page.url,
      path: page.path,
      lastModified: page.data.lastModified?.getTime(),
      pageTree: await source.serializePageTree(source.getPageTree()),
    }
  })

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: Mdx },
    {
      url,
      path,
      lastModified,
    }: {
      url: string
      path: string
      lastModified?: number
    }
  ) {
    const markdownUrl = `${url}.mdx`
    const sourceUrl = `${githubUrl}/blob/${gitConfig.branch}/docs/content/docs/${path}`

    return (
      <DocsPage
        toc={toc}
        tableOfContent={{ style: 'clerk' }}
        breadcrumb={{ includeRoot: true }}
      >
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="-mt-4 flex flex-row items-center gap-2 border-b pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={sourceUrl} />
        </div>
        <DocsBody>
          <Mdx
            components={{
              ...defaultMdxComponents,
              ...Twoslash,
            }}
          />
        </DocsBody>
        <div className="mt-8 flex flex-row flex-wrap items-center justify-between gap-4">
          <EditOnGitHub href={sourceUrl} />
          {lastModified && <PageLastUpdate date={new Date(lastModified)} />}
        </div>
      </DocsPage>
    )
  },
})

export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/') ?? []
    const data = await serverLoader({ data: slugs })
    await clientLoader.preload(data.path)
    return data
  },
})

function Page() {
  const data = useFumadocsLoader(Route.useLoaderData())

  return (
    <DocsLayout
      {...baseOptions()}
      tree={data.pageTree}
      sidebar={{ defaultOpenLevel: 1 }}
    >
      <Suspense>{clientLoader.useContent(data.path, data)}</Suspense>
    </DocsLayout>
  )
}
