/**
 * SSO accept endpoint — logs an admin in from a Remix-admin hand-off token.
 *
 *   GET /api/sso?token=<hmac-token>
 *
 * Verifies the token (signed by the Remix admin with the shared
 * SSO_CIRCULAR_SECRET), and on success mints a normal circular_session cookie
 * and redirects into the admin. This route is under /api, which the auth
 * middleware does NOT gate, so it's reachable without an existing session.
 */
import { NextRequest, NextResponse } from 'next/server'
import { signJWT } from '@/lib/auth/jwt'
import { verifySsoToken } from '@/lib/auth/sso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const loginUrl = new URL('/login', req.url)

  const secret = process.env.SSO_CIRCULAR_SECRET
  if (!secret) return NextResponse.redirect(loginUrl)

  const claims = verifySsoToken(secret, token, 'sso-circular')
  if (!claims) return NextResponse.redirect(loginUrl)

  // The hand-off comes from the Remix admin, so this is an admin session.
  const jwt = await signJWT({
    email: claims.email,
    name: claims.name || claims.email,
    role: 'admin',
    asset_access: [],
  })

  const res = NextResponse.redirect(new URL('/admin/feed', req.url))
  res.cookies.set('circular_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return res
}
