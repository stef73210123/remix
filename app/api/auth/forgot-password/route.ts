import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/sheets/users'
import { createResetToken } from '@/lib/auth/magic-link'
import { sendPasswordResetEmail } from '@/lib/email/send'

export const dynamic = 'force-dynamic'

const SUCCESS_MESSAGE = 'If that email is registered, you will receive a password reset link shortly.'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await getUser(normalizedEmail)

    if (user && user.active) {
      const token = await createResetToken(normalizedEmail)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://circular.enterprises'
      const resetUrl = `${siteUrl}/auth/set-password?token=${encodeURIComponent(token)}`
      try {
        await sendPasswordResetEmail(normalizedEmail, user.name, resetUrl)
      } catch (emailError) {
        console.error('[auth/forgot-password] Failed to send reset email:', emailError)
      }
    }

    // Always return generic success to prevent user enumeration
    return NextResponse.json({ message: SUCCESS_MESSAGE })
  } catch (error) {
    console.error('[auth/forgot-password] Error:', error)
    // Still return success to prevent enumeration
    return NextResponse.json({ message: SUCCESS_MESSAGE })
  }
}
