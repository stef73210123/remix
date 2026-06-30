import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { redis } from './redis'

/** Session cookie name — deliberately distinct from Circular's. */
export const SESSION_COOKIE = 'remix_admin_session'

export interface AdminUser {
  email: string
  name: string
  role: 'admin'
  passwordHash: string
}

export interface Session {
  email: string
  name: string
  role: string
}

function secret(): Uint8Array {
  const s = process.env.ADMIN_JWT_SECRET
  if (!s) throw new Error('ADMIN_JWT_SECRET env var is not set')
  return new TextEncoder().encode(s)
}

export async function signSession(payload: Session): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return {
      email: String(payload.email),
      name: String(payload.name),
      role: String(payload.role),
    }
  } catch {
    return null
  }
}

function userKey(email: string) {
  return `admin:user:${email.trim().toLowerCase()}`
}

export async function getUser(email: string): Promise<AdminUser | null> {
  return (await redis.get<AdminUser>(userKey(email))) ?? null
}

export async function saveUser(user: AdminUser): Promise<void> {
  await redis.set(userKey(user.email), user)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── Password reset tokens ─────────────────────────────────────────────
function resetKey(token: string) {
  return `admin:reset:${token}`
}

export async function createResetToken(email: string): Promise<string> {
  const token = crypto.randomUUID()
  // 1-hour expiry
  await redis.set(resetKey(token), email.trim().toLowerCase(), { ex: 60 * 60 })
  return token
}

export async function consumeResetToken(token: string): Promise<string | null> {
  const email = await redis.get<string>(resetKey(token))
  if (!email) return null
  await redis.del(resetKey(token))
  return email
}
