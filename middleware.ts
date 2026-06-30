import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth/jwt'

/**
 * Auth middleware (renamed from proxy.ts so Next.js actually runs it).
 *
 * Gates /portal, /deal-room, and /admin behind the circular_session JWT and
 * injects the authenticated user's identity into request headers for server
 * components. Applies on every host that serves the app (so /admin works
 * wherever the app is deployed, including atlas and the base domain).
 *
 * NOTE: the old proxy.ts also contained an atlas-only lockdown (404 everything
 * except /map). That is intentionally NOT enabled here, because atlas is
 * currently the only domain serving this app — locking it down would make
 * /admin unreachable. Re-introduce a host check only once the base domain
 * (remix.properties) is pointed at this project.
 */

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

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
  matcher: ['/portal/:path*', '/deal-room/:path*', '/admin/:path*', '/api/:path*'],
}
