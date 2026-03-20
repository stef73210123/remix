import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLinkToken } from '@/lib/auth/magic-link'
import { getUser } from '@/lib/sheets/users'
import { signJWT } from '@/lib/auth/jwt'
import { getPostLoginRedirect } from '@/lib/auth/middleware-helpers'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid', req.url))
  }

  try {
    const email = await verifyMagicLinkToken(token)
    if (!email) {
      return NextResponse.redirect(new URL('/login?error=expired', req.url))
    }

    // Re-check user is still active
    const user = await getUser(email)
    if (!user || !user.active) {
      return NextResponse.redirect(new URL('/login?error=invalid', req.url))
    }

    // Issue session JWT
    const jwt = await signJWT({
      email: user.email,
      name: user.name,
      role: user.role,
      asset_access: user.asset_access,
    })

    const redirectPath = getPostLoginRedirect(user.role)
    const response = NextResponse.redirect(new URL(redirectPath, req.url))

    response.cookies.set('circular_session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[auth/verify] Error:', error)
    return NextResponse.redirect(new URL('/login?error=invalid', req.url))
  }
}
