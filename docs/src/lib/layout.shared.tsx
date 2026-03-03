import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export const gitConfig = {
  user: 'letstri',
  repo: 'elitu',
  branch: 'main',
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Elitu - Type-Safe Utilities',
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  }
}
