import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getInvestorPositionForAsset } from '@/lib/sheets/investors'

export async function GET(req: NextRequest) {
  try {
    const headersList = await headers()
    const email = headersList.get('x-user-email')
    const role = headersList.get('x-user-role')
    const userAssets = headersList.get('x-user-assets')?.split(',') || []

    if (!email || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const asset = req.nextUrl.searchParams.get('asset')
    if (!asset) {
      return NextResponse.json({ error: 'asset param required' }, { status: 400 })
    }

    // LPs can only view their own assigned assets
    if (role === 'lp' && !userAssets.includes(asset)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const position = await getInvestorPositionForAsset(email, asset)
    if (!position) {
      return NextResponse.json(null)
    }

    return NextResponse.json(position)
  } catch (error) {
    console.error('[sheets/position] Error:', error)
    return NextResponse.json({ error: 'Failed to load position' }, { status: 500 })
  }
}
