import { GithubInfo } from 'fumadocs-ui/components/github-info'
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { BookOpenIcon } from 'lucide-react'

export const gitConfig = {
  user: 'letstri',
  repo: 'seitu',
  branch: 'main',
}

export const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Seitu',
      transparentMode: 'top',
    },
    links: [
      {
        icon: <BookOpenIcon />,
        text: 'Documentation',
        url: '/docs',
        active: 'nested-url',
      },
      {
        type: 'custom',
        children: <GithubInfo owner={gitConfig.user} repo={gitConfig.repo} />,
        secondary: true,
        on: 'menu',
      },
    ],
    githubUrl,
  }
}
