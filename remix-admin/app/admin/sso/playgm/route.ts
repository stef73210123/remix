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

/**
 * Post-SSO landing path forwarded to PlayGM. Only same-origin /admin paths are
 * passed through — this value comes from the query string and PlayGM redirects
 * to it, so anything else is dropped to avoid an open redirect. PlayGM
 * re-validates the same way as defense in depth.
 */
function safeNext(raw: string | null): string | null {
  if (!raw) return null
  if (!/^\/admin\/[A-Za-z0-9._~/-]*$/.test(raw)) return null
  if (raw.includes('//') || raw.includes('..')) return null
  return raw
}

export async function GET(req: Request) {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.redirect(new URL('/admin/login', req.url))

  const next = safeNext(new URL(req.url).searchParams.get('next'))

  // SSO_PLAYGM_SECRET must be set on THIS (remix-admin) Vercel project — it's
  // read at request time, so a redeploy is required after adding it. The same
  // value must also be set on the PlayGM server, which verifies the token.
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
  if (next) target.searchParams.set('next', next)
  return NextResponse.redirect(target)
}
