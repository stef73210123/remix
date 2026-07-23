/**
 * SSO hand-off token — lets a logged-in Remix admin open the Circular or
 * PlayGM admin without a second login.
 *
 * The three apps live on different domains, so cookies can't be shared. Instead
 * the Remix admin (this app) mints a short-lived, HMAC-signed token bound to a
 * target ("scope") and redirects to that target with `?token=`. The target
 * verifies the HMAC against a secret it shares only with this app, then sets
 * its own normal session.
 *
 * Format (dependency-free so the Fastify PlayGM server can verify it with plain
 * node:crypto too): `base64url(json).base64url(hmacSHA256(base64url(json)))`.
 */
import crypto from 'crypto'

export interface SsoClaims {
  email: string
  name: string
  scope: string
  exp: number
}

/** Mint a signed hand-off token. Default TTL is deliberately tiny (90s). */
export function mintSsoToken(
  secret: string,
  claims: { email: string; name: string; scope: string },
  ttlSeconds = 90,
): string {
  const payload: SsoClaims = { ...claims, exp: Math.floor(Date.now() / 1000) + ttlSeconds }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}
