import { defineConfig } from 'tsdown'

import packageJson from './package.json' with { type: 'json' }

export default defineConfig(({ watch }) => ({
  entry: ['./src/*/index.ts', './src/*/*/index.ts', './src/*/*/index.tsx'],
  dts: true,
  deps: {
    neverBundle: [
      ...Object.keys(packageJson.dependencies),
      ...Object.keys(packageJson.peerDependencies),
    ],
  },
  clean: !watch,
}))
