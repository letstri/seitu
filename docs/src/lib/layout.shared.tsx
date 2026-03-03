import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export const gitConfig = {
  user: 'letstri',
  repo: 'utix',
  branch: 'main',
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Utix - Type-Safe Utilities',
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  }
}
