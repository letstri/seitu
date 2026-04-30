import { defineConfig } from 'tsdown'
import packageJson from './package.json' with { type: 'json' }

export default defineConfig(({ watch }) => ({
  entry: {
    core: './src/core/index.ts',
    web: './src/web/index.ts',
    react: './src/react/index.ts',
    vue: './src/vue/index.ts',
    utils: './src/utils/index.ts',
  },
  dts: true,
  deps: {
    neverBundle: [...Object.keys(packageJson.dependencies), ...Object.keys(packageJson.peerDependencies)],
  },
  clean: !watch,
}))
