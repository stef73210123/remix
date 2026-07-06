/**
 * Per-meeting detail for the dashboard's expandable history rows.
 *
 *   GET /admin/api/municipal/meeting?id=<uuid>
 *     → { summary, excerpt, dbOk, dbError }
 *
 * `summary` is the enrichment summary stored on meeting.meta when present;
 * `excerpt` is a best-effort snippet of the meeting's extracted text (minutes /
 * agenda) as a fallback preview. Loaded lazily when a row is expanded so the
 * main summary payload stays light.
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipal } from '@/lib/municipal/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipal())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  let summary: string | null = null
  let excerpt: string | null = null
  let dbOk = false
  let dbError: string | undefined

  try {
    const { sql } = await import('@/lib/municipal/db')
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const meta = (await sql`SELECT meta FROM meeting WHERE id = ${id}`) as any[]
    const s = meta[0]?.meta?.summary
    summary = typeof s === 'string' && s.trim() ? s.trim() : null

    const txt = (await sql`
      SELECT left(full_text, 1400) AS excerpt
      FROM meeting_text
      WHERE meeting_id = ${id}
      ORDER BY (extractor = 'pdf-parse') DESC, char_length(full_text) DESC
      LIMIT 1
    `) as { excerpt: string }[]
    const e = txt[0]?.excerpt
    excerpt = typeof e === 'string' && e.trim() ? e.replace(/\s+/g, ' ').trim() : null
    dbOk = true
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({ summary, excerpt, dbOk, dbError })
}
