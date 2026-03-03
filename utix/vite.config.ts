import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    lib: {
      entry: {
        core: './src/core/index.ts',
        web: './src/web/index.ts',
        react: './src/react/index.ts',
      },
      formats: ['es'],
    },
    rolldownOptions: {
      external: ['react', 'react-dom'],
      plugins: [dts()],
    },
  },
})
