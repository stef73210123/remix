import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth/jwt'

/**
 * Atlas platform proxy
 *
 * Deployed to atlas.remix.properties — serves only the Cesium 3D map
 * and supporting API routes. Blocks deal-room, portal, admin, and
 * public pages. Also handles auth gating for protected routes.
 */

const ALLOWED_PREFIXES = [
  '/map',
  '/api/',
  '/cesium',
  '/auth',
  '/login',
  '/forgot-password',
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|css|js|map|json)$/)
  ) {
    return NextResponse.next()
  }

  // Root → redirect to /map
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/map', req.url))
  }

  // Block routes that aren't part of the atlas platform
  if (!ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Auth gating for protected routes
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
    if (!user || user.role !== 'admin') {
      return NextResponse.redirect(new URL('/portal', req.url))
    }
  }

  // Inject user identity into request headers for server components
  const headers = new Headers(req.headers)
  if (user) {
    headers.set('x-user-email', user.email)
    headers.set('x-user-role', user.role)
    headers.set('x-user-name', user.name)
    headers.set('x-user-assets', user.asset_access.join(','))
  }

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
