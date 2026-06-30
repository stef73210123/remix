import { NextResponse } from 'next/server'
import {
  consumeResetToken,
  getUser,
  saveUser,
  hashPassword,
} from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: { token?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const token = body.token || ''
  const password = body.password || ''
  if (!token || !password) {
    return NextResponse.json(
      { error: 'Missing token or password' },
      { status: 400 }
    )
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  const email = await consumeResetToken(token)
  if (!email) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired' },
      { status: 400 }
    )
  }

  const user = await getUser(email)
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 400 })
  }

  user.passwordHash = await hashPassword(password)
  await saveUser(user)
  return NextResponse.json({ ok: true })
}
