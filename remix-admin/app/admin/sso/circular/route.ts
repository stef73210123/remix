/**
 * SSO hand-off to the Circular admin.
 *
 *   GET /admin/sso/circular
 *
 * Verifies the current Remix admin session, mints a short-lived token signed
 * with SSO_CIRCULAR_SECRET (shared only with the Circular app), and redirects to
 * Circular's accept endpoint, which sets the circular_session cookie.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { mintSsoToken } from '@/lib/sso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CIRCULAR_ACCEPT_URL = 'https://investors.circular.enterprises/api/sso'

export async function GET(req: Request) {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.redirect(new URL('/admin/login', req.url))

  const secret = process.env.SSO_CIRCULAR_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SSO_CIRCULAR_SECRET not configured' }, { status: 500 })
  }

  const token = mintSsoToken(secret, {
    email: session.email,
    name: session.name,
    scope: 'sso-circular',
  })

  const target = new URL(CIRCULAR_ACCEPT_URL)
  target.searchParams.set('token', token)
  return NextResponse.redirect(target)
}
