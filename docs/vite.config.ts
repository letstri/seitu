import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import mdx from 'fumadocs-mdx/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
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
  resolve: {
    tsconfigPaths: true,
    // Vite 8 / Rolldown cannot bundle raw `.wasm` via shiki's `unwasm` export condition.
    conditions: ['import', 'module', 'browser', 'default'],
    alias: {
      'tslib': 'tslib/tslib.es6.js',
      'shiki/wasm': 'shiki/dist/wasm.mjs',
    },
  },
})
