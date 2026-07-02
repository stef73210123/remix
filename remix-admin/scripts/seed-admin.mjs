/**
 * One-time seed of the first admin user.
 *
 * Usage (set env vars, then run from the remix-admin/ folder):
 *   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... \
 *   ADMIN_SEED_EMAIL=you@remixcre.com ADMIN_SEED_NAME="Stefan" \
 *   ADMIN_SEED_PASSWORD='your-strong-password' \
 *   npm run seed-admin
 *
 * You type your own password; it is hashed with bcrypt before storage.
 * Delete the ADMIN_SEED_* values afterward.
 */
import { Redis } from '@upstash/redis'
import bcrypt from 'bcryptjs'

const email = (process.env.ADMIN_SEED_EMAIL || '').trim().toLowerCase()
const name = process.env.ADMIN_SEED_NAME || 'Admin'
const password = process.env.ADMIN_SEED_PASSWORD || ''

if (!email || !password) {
  console.error('Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD before running.')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const redis = Redis.fromEnv()
const passwordHash = await bcrypt.hash(password, 10)
await redis.set(`admin:user:${email}`, {
  email,
  name,
  role: 'admin',
  passwordHash,
})

console.log(`✓ Seeded admin user: ${email}`)
