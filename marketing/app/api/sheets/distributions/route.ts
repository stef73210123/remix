import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getDistributionsForUser } from '@/lib/sheets/distributions'

export async function GET(req: NextRequest) {
  try {
    const headersList = await headers()
    const email = headersList.get('x-user-email')
    const role = headersList.get('x-user-role')
    const userAssets = headersList.get('x-user-assets')?.split(',') || []

    if (!email || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const asset = req.nextUrl.searchParams.get('asset') || undefined

    // LPs can only view their own assigned assets
    if (role === 'lp' && asset && !userAssets.includes(asset)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const distributions = await getDistributionsForUser(email, asset)
    return NextResponse.json(distributions)
  } catch (error) {
    console.error('[sheets/distributions] Error:', error)
    return NextResponse.json({ error: 'Failed to load distributions' }, { status: 500 })
  }
}
