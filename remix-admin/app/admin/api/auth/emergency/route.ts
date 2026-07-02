import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getUser, saveUser, hashPassword } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * TEMPORARY one-shot recovery + diagnostic route.
 *
 * Purpose: (a) reset the admin passwordHash for a specific email when the
 * email-reset pipeline is broken and the operator cannot get in; (b) capture
 * the actual send() error from Resend so the root cause is visible without
 * grepping runtime logs.
 *
 * DELETE THIS FILE + REDEPLOY once Stefan is back in and the mail pipeline
 * is fixed. This route is protected by a strong bearer token in
 * DIAG_SECRET env var - an attacker without that token cannot use it.
 */
export async function POST(req: Request) {
  // 1. Bearer guard
  const auth = req.headers.get('authorization') || ''
  const expected = process.env.DIAG_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'DIAG_SECRET not set on server' },
      { status: 500 }
    )
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  let body: {
    action?: 'reset' | 'diagnose' | 'both'
    email?: string
    newPassword?: string
    probeTo?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = body.action ?? 'both'
  const email = (body.email || '').trim().toLowerCase()
  const newPassword = body.newPassword || ''
  const probeTo = (body.probeTo || email).trim().toLowerCase()

  const result: Record<string, unknown> = {
    action,
    envCheck: {
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
      resendFrom: process.env.RESEND_FROM || null,
      adminPublicUrl: process.env.ADMIN_PUBLIC_URL || null,
      hasUpstashUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      hasUpstashToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    },
  }

  // 3. Reset (if requested)
  if (action === 'reset' || action === 'both') {
    if (!email) {
      return NextResponse.json(
        { error: 'email required for reset' },
        { status: 400 }
      )
    }
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'newPassword (>=8 chars) required for reset' },
        { status: 400 }
      )
    }
    const user = await getUser(email)
    if (!user) {
      result.reset = { ok: false, error: `no admin user found for ${email}` }
    } else {
      user.passwordHash = await hashPassword(newPassword)
      await saveUser(user)
      result.reset = { ok: true, email: user.email, name: user.name }
    }
  }

  // 4. Diagnose Resend send
  if (action === 'diagnose' || action === 'both') {
    const apiKey = process.env.RESEND_API_KEY
    const from =
      process.env.RESEND_FROM || 'Remix Admin <onboarding@resend.dev>'
    if (!apiKey) {
      result.diagnose = { ok: false, error: 'RESEND_API_KEY not set' }
    } else if (!probeTo) {
      result.diagnose = { ok: false, error: 'probeTo required' }
    } else {
      try {
        const resend = new Resend(apiKey)
        const sendResult = await resend.emails.send({
          from,
          to: probeTo,
          subject: 'Remix Admin diagnostic ping',
          html:
            '<p>This is a diagnostic email from the Remix Admin recovery route. ' +
            'If you are seeing this, the Resend pipeline is working end-to-end.</p>',
        })
        result.diagnose = {
          ok: !sendResult.error,
          data: sendResult.data ?? null,
          error: sendResult.error
            ? {
                name: sendResult.error.name,
                message: sendResult.error.message,
              }
            : null,
          from,
          to: probeTo,
        }
      } catch (e) {
        const err = e as Error & { statusCode?: number }
        result.diagnose = {
          ok: false,
          thrown: true,
          error: {
            name: err.name,
            message: err.message,
            statusCode: err.statusCode ?? null,
            stack: err.stack?.split('\n').slice(0, 5).join('\n') ?? null,
          },
          from,
          to: probeTo,
        }
      }
    }
  }

  return NextResponse.json(result)
}
