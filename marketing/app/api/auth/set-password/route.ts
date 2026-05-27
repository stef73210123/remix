import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/magic-link'
import { hashPassword } from '@/lib/auth/password'
import { getUserWithPasswordHash, updateUserPasswordHash } from '@/lib/sheets/users'
import { signJWT } from '@/lib/auth/jwt'
import { getPostLoginRedirect } from '@/lib/auth/middleware-helpers'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, password, confirmPassword } = await req.json()

    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const payload = await verifyToken(token)
    if (!payload || !['invite', 'reset'].includes(payload.purpose)) {
      return NextResponse.json({ error: 'This link is invalid or has expired' }, { status: 400 })
    }

    const user = await getUserWithPasswordHash(payload.email)
    if (!user || !user.active) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    const hash = await hashPassword(password)
    await updateUserPasswordHash(user.email, hash)

    const sessionToken = await signJWT({
      email: user.email,
      name: user.name,
      role: user.role,
      asset_access: user.asset_access,
    })

    const redirectTo = getPostLoginRedirect(user.role)

    const response = NextResponse.json({ redirectTo })
    response.cookies.set('circular_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return response
  } catch (error) {
    console.error('[auth/set-password] Error:', error)
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 })
  }
}
