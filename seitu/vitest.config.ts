import react from '@vitejs/plugin-react'
import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react({
      include: ['**/src/react/*.ts?(x)'],
    }),
    solid({
      include: ['**/src/solid/*.ts?(x)'],
    }),
  ],
  test: {
    environment: 'happy-dom',
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Node 25+ ships Web Storage on by default, which shadows happy-dom's
    // localStorage polyfill; disable it so the in-memory polyfill is used.
    execArgv: ['--no-experimental-webstorage'],
  },
})
