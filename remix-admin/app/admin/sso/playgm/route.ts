/**
 * SSO hand-off to the PlayGM admin.
 *
 *   GET /admin/sso/playgm
 *
 * Verifies the current Remix admin session, mints a short-lived token signed
 * with SSO_PLAYGM_SECRET (shared only with the PlayGM server), and redirects to
 * PlayGM's accept endpoint, which sets a PlayGM admin session cookie.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { mintSsoToken } from '@/lib/sso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLAYGM_ACCEPT_URL = 'https://playgm-server.vercel.app/admin/sso'

export async function GET(req: Request) {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.redirect(new URL('/admin/login', req.url))

  const secret = process.env.SSO_PLAYGM_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SSO_PLAYGM_SECRET not configured' }, { status: 500 })
  }

  const token = mintSsoToken(secret, {
    email: session.email,
    name: session.name,
    scope: 'sso-playgm',
  })

  const target = new URL(PLAYGM_ACCEPT_URL)
  target.searchParams.set('token', token)
  return NextResponse.redirect(target)
}
