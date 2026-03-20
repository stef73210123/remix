import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from '@/types'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

/**
 * Signs a JWT with 7-day expiry. Sets the circular_session cookie.
 */
export async function signJWT(payload: Omit<JWTPayload, 'exp'>): Promise<string> {
  const secret = getJwtSecret()
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

/**
 * Verifies and decodes a JWT. Returns null if invalid or expired.
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}
