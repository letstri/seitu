import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import packageJson from './package.json'

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
        vue: './src/vue/index.ts',
      },
      formats: ['es'],
    },
    rolldownOptions: {
      external: [...Object.keys(packageJson.dependencies), ...Object.keys(packageJson.peerDependencies)],
      plugins: [dts()],
    },
  },
})
