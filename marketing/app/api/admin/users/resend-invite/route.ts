import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getUser } from '@/lib/sheets/users'
import { createInviteToken } from '@/lib/auth/magic-link'
import { sendInviteEmail } from '@/lib/email/send'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const headersList = await headers()
  const role = headersList.get('x-user-role')
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const user = await getUser(email.toLowerCase().trim())
    if (!user || !user.active) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    const inviteToken = await createInviteToken(user.email)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://circular.enterprises'
    const inviteUrl = `${siteUrl}/auth/set-password?token=${encodeURIComponent(inviteToken)}`
    await sendInviteEmail(user.email, user.name, inviteUrl)

    return NextResponse.json({ message: 'Invite sent' })
  } catch (error) {
    console.error('[admin/users/resend-invite] Error:', error)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}
