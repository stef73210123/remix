import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getUser, createResetToken } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()

  // Always respond ok so we don't reveal which emails exist.
  if (email) {
    const user = await getUser(email)
    if (user) {
      const token = await createResetToken(email)
      const base = process.env.ADMIN_PUBLIC_URL || ''
      const link = `${base}/admin/reset?token=${token}`
      const apiKey = process.env.RESEND_API_KEY
      if (apiKey) {
        try {
          const resend = new Resend(apiKey)
          await resend.emails.send({
            from: process.env.RESEND_FROM || 'Remix Admin <onboarding@resend.dev>',
            to: email,
            subject: 'Reset your Remix Admin password',
            html: `<p>We received a request to reset your Remix Admin password.</p>
<p><a href="${link}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
<p>If you didn't request this, you can ignore this email.</p>`,
          })
        } catch (e) {
          console.error('reset email failed', e)
        }
      } else {
        console.warn('RESEND_API_KEY not set; reset link:', link)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
