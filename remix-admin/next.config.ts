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
  // The dark Remix app is proxied under remixcre.com/admin, so its assets load
  // cross-origin from this app's own Vercel domain. The public OpenNorthCastle
  // deployment is served at its own domain root, so it needs no asset prefix.
  assetPrefix: process.env.NEXT_PUBLIC_APP_FLAVOR === 'opennorthcastle' ? undefined : 'https://remix-admin-omega.vercel.app',
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The municipal transcript routes read committed text/JSON from lib/.../data
  // at runtime; include those files in the serverless function bundles so they
  // exist on Vercel (Next can't trace fs reads built from dynamic paths).
  outputFileTracingIncludes: {
    '/admin/api/municipal/transcript': [
      './lib/municipal/data/nc-planning/transcripts/**',
      './lib/municipal/data/nc-townboard/transcripts/**',
    ],
    '/admin/api/municipal/transcript-analysis': [
      './lib/municipal/data/nc-planning/analysis.json',
      './lib/municipal/data/nc-townboard/analysis.json',
    ],
    '/admin/api/municipal/member-dossier': [
      './lib/municipal/data/nc-planning/dossiers.json',
      './lib/municipal/data/nc-townboard/dossiers.json',
    ],
    // Federates every board's analysis.json, so include them all.
    '/admin/api/municipal/property': [
      './lib/municipal/data/nc-planning/analysis.json',
      './lib/municipal/data/nc-townboard/analysis.json',
    ],
  },
}

// build: rebuild trigger after disabling "include files outside root directory"
export default nextConfig
