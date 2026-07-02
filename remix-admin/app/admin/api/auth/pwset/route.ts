import { NextResponse } from 'next/server'
import {
  getUser,
  saveUser,
  hashPassword,
  type AdminUser,
} from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * TEMPORARY one-shot password set endpoint.
 *
 * Bearer-guarded on DIAG_SECRET (same pattern as the earlier emergency route).
 * Reads {email, newPassword} from the body, bcrypts (cost 10 — matches the
 * app's hashPassword helper), writes the new passwordHash to Upstash under
 * admin:user:<email>.
 *
 * DELETE THIS FILE + REMOVE DIAG_SECRET + REDEPLOY immediately after use.
 */
export async function POST(req: Request) {
  const expected = process.env.DIAG_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'DIAG_SECRET not set on server' },
      { status: 500 }
    )
  }
  const auth = req.headers.get('authorization') || ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { email?: string; newPassword?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const email = (body.email || '').trim().toLowerCase()
  const newPassword = body.newPassword || ''
  if (!email || !newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: 'email + newPassword (>=8 chars) required' },
      { status: 400 }
    )
  }

  const existing = await getUser(email)
  if (!existing) {
    return NextResponse.json(
      { error: `no admin user for ${email}` },
      { status: 404 }
    )
  }

  const newHash = await hashPassword(newPassword)
  const updated: AdminUser = { ...existing, passwordHash: newHash }
  await saveUser(updated)

  // Read-back verification so the caller has independent proof of persistence.
  const reread = await getUser(email)
  const roundsFromHash = /^\$2[aby]\$(\d\d)\$/.exec(newHash)?.[1] ?? null

  return NextResponse.json({
    ok: true,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    bcryptRounds: roundsFromHash,
    persistedHashPrefix: reread?.passwordHash?.slice(0, 7) ?? null,
    // Do NOT return the hash itself — read-back to a 7-char prefix is enough
    // to prove persistence without leaking bcrypt output.
  })
}
