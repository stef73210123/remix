import { SignJWT, jwtVerify } from 'jose'

function getMagicLinkSecret(): Uint8Array {
  const secret = process.env.MAGIC_LINK_SECRET
  if (!secret) throw new Error('MAGIC_LINK_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

/**
 * Generates a signed magic link token valid for 15 minutes.
 */
export async function generateMagicLinkToken(email: string): Promise<string> {
  const secret = getMagicLinkSecret()
  return new SignJWT({ email, purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret)
}

/**
 * Verifies a magic link token. Returns the email if valid, null if invalid/expired.
 */
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  try {
    const secret = getMagicLinkSecret()
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== 'magic-link') return null
    return (payload.email as string) || null
  } catch {
    return null
  }
}

/**
 * Builds the magic link URL for a given token.
 */
export function buildMagicLinkUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`
}

/**
 * Creates an invite token valid for 7 days (purpose: 'invite').
 */
export async function createInviteToken(email: string): Promise<string> {
  const secret = getMagicLinkSecret()
  return new SignJWT({ email, purpose: 'invite' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

/**
 * Creates a password reset token valid for 15 minutes (purpose: 'reset').
 */
export async function createResetToken(email: string): Promise<string> {
  const secret = getMagicLinkSecret()
  return new SignJWT({ email, purpose: 'reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret)
}

/**
 * Verifies an invite or reset token. Returns { email, purpose } if valid, null if invalid/expired.
 */
export async function verifyToken(token: string): Promise<{ email: string; purpose: string } | null> {
  try {
    const secret = getMagicLinkSecret()
    const { payload } = await jwtVerify(token, secret)
    const email = payload.email as string
    const purpose = payload.purpose as string
    if (!email || !purpose) return null
    return { email, purpose }
  } catch {
    return null
  }
}
