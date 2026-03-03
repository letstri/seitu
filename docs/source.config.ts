import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins'
import { defineConfig, defineDocs } from 'fumadocs-mdx/config'
import { transformerTwoslash } from 'fumadocs-twoslash'
import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs'
import ts from 'typescript'

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
          twoslashOptions: {
            compilerOptions: {
              jsx: ts.JsxEmit.ReactJSX,
              jsxImportSource: 'react',
              moduleResolution: ts.ModuleResolutionKind.Bundler,
            },
          },
        }),
      ],
    },
  },
})
