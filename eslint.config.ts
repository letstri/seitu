import antfu from '@antfu/eslint-config'

export default antfu(
  {
    react: true,
    vue: true,
    rules: {
      'node/prefer-global/process': 'off',
      'react/no-use-context': 'off',
      'react/only-export-components': 'off',
      'react-refresh/only-export-components': 'off',
      'pnpm/yaml-enforce-settings': 'off',
    },
    ignores: ['**/routeTree.gen.ts', '**/.source', '**/.next', '**/next-env.d.ts', '**/*.md', '**/_artifacts/**'],
  },
  {
    files: ['playground/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['seitu/src/vue/**/*', 'seitu/src/svelte/**/*'],
    rules: {
      'react/rules-of-hooks': 'off',
      'react/no-unnecessary-use-prefix': 'off',
    },
  },
  {
    files: ['seitu/src/solid/**/*'],
    rules: {
      'react/rules-of-hooks': 'off',
      'react/no-unnecessary-use-prefix': 'off',
      'react/no-context-provider': 'off',
      'react/no-missing-key': 'off',
    },
  },
)
