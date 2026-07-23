/**
 * SSO hand-off verification for tokens minted by the Remix admin.
 *
 * The Remix admin (a separate app on remixcre.com) signs a short-lived,
 * HMAC-signed token with a secret shared only with this app. We verify it here
 * and, if valid, mint a normal circular_session. See app/api/sso/route.ts.
 *
 * Token format: `base64url(json).base64url(hmacSHA256(base64url(json)))`.
 */
import crypto from 'crypto'

export interface SsoClaims {
  email: string
  name: string
  scope: string
  exp: number
}

export function verifySsoToken(
  secret: string,
  token: string,
  expectedScope: string,
): SsoClaims | null {
  const [body, sig] = String(token || '').split('.')
  if (!body || !sig) return null

  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let claims: SsoClaims
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (claims.scope !== expectedScope) return null
  if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null
  if (!claims.email) return null
  return claims
}
