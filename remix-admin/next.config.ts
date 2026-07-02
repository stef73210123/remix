import type { NextConfig } from 'next'
import path from 'path'

/**
 * The admin app's routes live physically under /admin (app/admin/*), so it is
 * reached at remixcre.com/admin via a rewrite on the marketing site.
 *
 * We intentionally do NOT use `basePath`: Next.js + Vercel handle basePath
 * inconsistently for server redirects (Vercel strips it, local prepends it),
 * which breaks the login redirect. Physical /admin routes + a cross-origin
 * assetPrefix avoid basePath entirely.
 *
 * assetPrefix makes static assets load directly from this app's own domain,
 * so they resolve correctly even when the HTML is proxied through
 * remixcre.com/admin.
 *
 * turbopack.root pins the workspace root to this directory. Without it,
 * Next.js walks up until it finds a lockfile and picks up the parent
 * ~/Projects/remix/ marketing app, which pulls in an unrelated
 * middleware.ts that references files not in this app.
 */
const nextConfig: NextConfig = {
  assetPrefix: 'https://remix-admin-omega.vercel.app',
  turbopack: {
    root: path.resolve(__dirname),
  },
}

// build: rebuild trigger after disabling "include files outside root directory"
export default nextConfig
