import { defineConfig } from 'oxlint'

import { ignorePatterns } from './ignores.ts'

export default defineConfig({
  ignorePatterns,
  plugins: [
    'import',
    'jsx-a11y',
    'nextjs',
    'node',
    'oxc',
    'promise',
    'react',
    'react-perf',
    'typescript',
    'unicorn',
    'vitest',
  ],
  categories: {
    correctness: 'error',
  },
  rules: {
    'nextjs/no-head-element': 'off',
    'react/refs': 'off',
    'react/use-memo': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'unicorn/no-useless-spread': 'off',
    'vitest/expect-expect': 'off',
    'vitest/require-mock-type-parameters': 'off',
  },
})
