import { NextRequest, NextResponse } from 'next/server'
import { getUserWithPasswordHash } from '@/lib/sheets/users'
import { verifyPassword } from '@/lib/auth/password'
import { signJWT } from '@/lib/auth/jwt'
import { getPostLoginRedirect } from '@/lib/auth/middleware-helpers'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await getUserWithPasswordHash(email.toLowerCase().trim())

    // Generic error to prevent user enumeration
    if (!user || !user.active || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await signJWT({
      email: user.email,
      name: user.name,
      role: user.role,
      asset_access: user.asset_access,
    })

    const redirectTo = getPostLoginRedirect(user.role)

    const response = NextResponse.json({ redirectTo })
    response.cookies.set('circular_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return response
  } catch (error) {
    console.error('[auth/login] Error:', error)
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 })
  }
}
