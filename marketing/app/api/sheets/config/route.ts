import { NextRequest, NextResponse } from 'next/server'
import { getAssetConfig } from '@/lib/sheets/config'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')
    if (!slug) {
      return NextResponse.json({ error: 'slug param required' }, { status: 400 })
    }
    const config = await getAssetConfig(slug)
    return NextResponse.json(config)
  } catch (error) {
    console.error('[sheets/config] Error:', error)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}
