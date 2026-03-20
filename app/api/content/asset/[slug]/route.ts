import { NextRequest, NextResponse } from 'next/server'
import { getAssetContent } from '@/lib/gdocs/assets'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const type = (req.nextUrl.searchParams.get('type') || 'public') as 'public' | 'dealroom'

    const validSlugs = ['livingstonfarm', 'wrenofthewoods']
    if (!validSlugs.includes(slug)) {
      return NextResponse.json({ error: 'Unknown asset' }, { status: 404 })
    }

    const content = await getAssetContent(slug, type)
    return NextResponse.json(content)
  } catch (error) {
    console.error('[content/asset] Error:', error)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}
