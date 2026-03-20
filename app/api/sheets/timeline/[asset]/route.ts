import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTimeline } from '@/lib/sheets/timeline'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ asset: string }> }
) {
  try {
    const headersList = await headers()
    const email = headersList.get('x-user-email')
    const role = headersList.get('x-user-role')
    const userAssets = headersList.get('x-user-assets')?.split(',') || []

    if (!email || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { asset } = await params

    if (role === 'lp' && !userAssets.includes(asset)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const timeline = await getTimeline(asset)
    return NextResponse.json(timeline)
  } catch (error) {
    console.error('[sheets/timeline] Error:', error)
    return NextResponse.json({ error: 'Failed to load timeline' }, { status: 500 })
  }
}
