import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import mdx from 'fumadocs-mdx/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  server: {
    port: 3000,
  },
  plugins: [
    mdx(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    react(),
    nitro({
      preset: 'vercel',
    }),
  ],
  // `use-sync-external-store` is CJS, so with React external to the SSR build its
  // `require('react')` survives into the server bundle and throws MODULE_NOT_FOUND on
  // Vercel, where the function ships without `node_modules`. Bundling every dependency
  // into the SSR graph keeps one React instance and no runtime requires. Build only —
  // dev cannot run React's CJS entry through the module runner.
  ...(command === 'build' && { ssr: { noExternal: true } }),
  resolve: {
    tsconfigPaths: true,
    // Vite 8 / Rolldown cannot bundle raw `.wasm` via shiki's `unwasm` export condition.
    conditions: ['import', 'module', 'browser', 'default'],
    alias: {
      tslib: 'tslib/tslib.es6.js',
      'shiki/wasm': 'shiki/dist/wasm.mjs',
    },
  },
}))
