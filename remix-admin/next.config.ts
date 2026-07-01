import type { NextConfig } from 'next'

/**
 * The admin app's routes live physically under /admin (app/admin/*), so it is
 * reached at remix.properties/admin via a rewrite on the marketing site.
 *
 * We intentionally do NOT use `basePath`: Next.js + Vercel handle basePath
 * inconsistently for server redirects (Vercel strips it, local prepends it),
 * which breaks the login redirect. Physical /admin routes + a cross-origin
 * assetPrefix avoid basePath entirely.
 *
 * assetPrefix makes static assets load directly from this app's own domain,
 * so they resolve correctly even when the HTML is proxied through
 * remix.properties/admin.
 */
const nextConfig: NextConfig = {
  assetPrefix: 'https://remix-admin-omega.vercel.app',
}

// build: rebuild trigger after disabling "include files outside root directory"

export default nextConfig
