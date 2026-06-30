import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth/jwt'

/**
 * Platform middleware (renamed from proxy.ts so Next.js actually runs it).
 *
 * Host-aware:
 *  - atlas.remix.properties → locked down to the Cesium map + supporting
 *    routes (everything else 404s), preserving the standalone Atlas surface.
 *  - all other hosts (e.g. remix.properties) → full portal app, with
 *    /portal, /deal-room, and /admin gated behind the circular_session JWT.
 *
 * In both cases the authenticated user's identity is injected into request
 * headers for server components.
 */

const ATLAS_ALLOWED_PREFIXES = [
  '/map',
  '/api/',
  '/cesium',
  '/auth',
  '/login',
  '/forgot-password',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|css|js|map|json)$/)
  ) {
    return NextResponse.next()
  }

  const host = req.headers.get('host') || ''
  const isAtlas = host.startsWith('atlas.')

  // Atlas subdomain: restrict to the map platform only
  if (isAtlas) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/map', req.url))
    }
    if (!ATLAS_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  // Auth gating for protected routes (all hosts)
  const token = req.cookies.get('circular_session')?.value
  const user = token ? await verifyJWT(token) : null

  if (pathname.startsWith('/portal')) {
    if (!user || !['lp', 'gp', 'admin'].includes(user.role)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  if (pathname.startsWith('/deal-room')) {
    if (!user || !['dealroom', 'lp', 'gp', 'admin'].includes(user.role)) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL('/portal', req.url))
    }
  }

  // Inject user identity into request headers for server components
  const headers = new Headers(req.headers)
  if (user) {
    headers.set('x-user-email', user.email)
    headers.set('x-user-role', user.role)
    headers.set('x-user-name', user.name)
    headers.set('x-user-assets', (user.asset_access || []).join(','))
  }

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
