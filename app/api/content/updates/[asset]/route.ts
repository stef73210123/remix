import { NextRequest, NextResponse } from 'next/server'
import { getAssetUpdates } from '@/lib/gdocs/updates'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ asset: string }> }
) {
  try {
    const { asset } = await params
    const validSlugs = ['livingstonfarm', 'wrenofthewoods']
    if (!validSlugs.includes(asset)) {
      return NextResponse.json({ error: 'Unknown asset' }, { status: 404 })
    }

    const updates = await getAssetUpdates(asset)
    return NextResponse.json(updates)
  } catch (error) {
    console.error('[content/updates] Error:', error)
    return NextResponse.json({ error: 'Failed to load updates' }, { status: 500 })
  }
}
