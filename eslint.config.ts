import antfu from '@antfu/eslint-config'

export default antfu(
  {
    react: true,
    rules: {
      'node/prefer-global/process': 'off',
      'react/no-use-context': 'off',
      'react/only-export-components': 'off',
      'react-refresh/only-export-components': 'off',
      'pnpm/yaml-enforce-settings': 'off',
    },
    ignores: ['**/routeTree.gen.ts', '**/.source', '**/.next', '**/next-env.d.ts', '**/*.md'],
  },
  {
    files: ['playground/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['seitu/src/vue/**/*'],
    rules: {
      'react/rules-of-hooks': 'off',
      'react/no-unnecessary-use-prefix': 'off',
    },
  },
)
