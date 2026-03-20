import { NextRequest, NextResponse } from 'next/server'
import { appendAnnouncement, getAnnouncementsForAsset } from '@/lib/sheets/announcements'
import { listUsers } from '@/lib/sheets/users'
import { sendInvestorUpdateEmail } from '@/lib/email/send'
import { ASSET_NAMES } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const asset = request.nextUrl.searchParams.get('asset') || ''
  const announcements = await getAnnouncementsForAsset(asset)
  return NextResponse.json({ announcements })
}

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  const adminEmail = request.headers.get('x-user-email') || 'admin'
  if (role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { asset, title, body, notify, media_urls } = await request.json()
  if (!asset || !title || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const announcement = await appendAnnouncement({
    asset,
    title,
    body,
    posted_by: adminEmail,
    posted_at: new Date().toISOString(),
    media_urls: media_urls || '',
  })

  // Send email notifications if requested
  const emailResults = { sent: 0, failed: 0, skipped: false }
  if (notify) {
    try {
      const users = await listUsers()
      const assetName = ASSET_NAMES[asset as keyof typeof ASSET_NAMES] || asset
      const recipients = users.filter(
        (u) => u.active && (u.role === 'lp' || u.role === 'gp') && u.asset_access.includes(asset)
      )

      await Promise.allSettled(
        recipients.map(async (u) => {
          try {
            await sendInvestorUpdateEmail(u.email, u.name, assetName, title, body, asset)
            emailResults.sent++
          } catch {
            emailResults.failed++
          }
        })
      )
    } catch {
      emailResults.skipped = true
    }
  }

  return NextResponse.json({ success: true, announcement, emailResults })
}
