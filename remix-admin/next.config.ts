import type { NextConfig } from 'next'

/**
 * The admin app is mounted under /admin so it can be proxied from the
 * marketing site (remix.properties/admin → this app). basePath makes all
 * routes and static assets live under /admin automatically.
 */
const nextConfig: NextConfig = {
  basePath: '/admin',
}

export default nextConfig
