import { NextResponse } from 'next/server'
import { getPlatformContent } from '@/lib/gdocs/platform'

export const revalidate = 300 // 5 minutes ISR

export async function GET() {
  try {
    const content = await getPlatformContent()
    return NextResponse.json(content)
  } catch (error) {
    console.error('[content/platform] Error:', error)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}
