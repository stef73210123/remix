import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth/jwt'

export async function proxy(req: NextRequest) {
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
  matcher: ['/portal/:path*', '/deal-room/:path*', '/admin/:path*', '/api/:path*'],
}
