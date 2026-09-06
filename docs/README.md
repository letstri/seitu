# docs

Documentation site for [Seitu](https://seitu.letstri.dev), built with [Fumadocs](https://fumadocs.dev) on TanStack Start.

API pages under `content/docs/**` (except `index.mdx` and `meta.json`) are generated from JSDoc in `../seitu/src` — edit the source comments, not the MDX:

```bash
pnpm run docs:generate
```

Run the development server:

```bash
pnpm dev
```

Machine-readable exports: `/llms.txt`, `/llms-full.txt`, and any page as Markdown by appending `.mdx` to its URL.
