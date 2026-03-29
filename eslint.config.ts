import antfu from '@antfu/eslint-config'

export default antfu(
  {
    react: true,
    rules: {
      'node/prefer-global/process': 'off',
      'react/no-use-context': 'off',
      'react-refresh/only-export-components': 'off',
    },
    ignores: ['**/routeTree.gen.ts', '**/.source', '**/.next', '**/next-env.d.ts'],
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
      'react-hooks/rules-of-hooks': 'off',
      'react/no-unnecessary-use-prefix': 'off',
    },
  },
)
