import { NextRequest, NextResponse } from 'next/server'
import { generateSignedDownloadUrl } from '@/lib/storage/r2'

export const dynamic = 'force-dynamic'

/**
 * Public proxy for R2-stored media (photos uploaded via admin).
 * Only exposes keys under the "media/" prefix — investor documents are never accessible here.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
  if (!key.startsWith('media/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    const url = await generateSignedDownloadUrl(key, 3600) // 1-hour expiry
    return NextResponse.redirect(url, 307)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
