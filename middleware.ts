import { NextRequest, NextResponse } from 'next/server'

/**
 * Atlas platform middleware
 *
 * This app is deployed to atlas.remix.properties and only serves the
 * Cesium 3D map viewer and its supporting API routes.
 *
 * All other routes (deal-room, portal, admin, public pages, etc.)
 * are blocked and return 404.
 */

// Routes that atlas.remix.properties should serve
const ALLOWED_PREFIXES = [
  '/map',
  '/api/',
  '/cesium',
  '/auth',
  '/login',
  '/forgot-password',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|css|js|map|json)$/)
  ) {
    return NextResponse.next()
  }

  // Root → redirect to /map
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/map', request.url))
  }

  // Allow permitted routes
  if (ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Block everything else (deal-room, portal, admin, public pages, etc.)
  return new NextResponse('Not Found', { status: 404 })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
