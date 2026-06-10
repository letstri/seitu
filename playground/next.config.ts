import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
  },
}

export default nextConfig
