/**
 * Morning-briefing ingest.
 *
 *   POST /admin/api/briefing
 *   headers: x-briefing-secret: <BRIEFING_INGEST_SECRET>
 *   body: { markdown | text: string, fitness?: string[], date?: "YYYY-MM-DD" }
 *
 * Called by the daily Cowork briefing task (a third delivery destination
 * alongside Slack + email). Stores the latest briefing so the admin Dashboard
 * can render it. Authenticated with a shared secret since the caller is a
 * server task, not a logged-in browser.
 */
import { NextRequest, NextResponse } from 'next/server'
import { setLatestBriefing, etDate, type Briefing } from '@/lib/briefing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = process.env.BRIEFING_INGEST_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'BRIEFING_INGEST_SECRET not configured' }, { status: 500 })
  }
  if (req.headers.get('x-briefing-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const markdown =
    typeof body.markdown === 'string'
      ? body.markdown
      : typeof body.text === 'string'
        ? body.text
        : ''
  if (!markdown.trim()) {
    return NextResponse.json({ error: 'markdown/text required' }, { status: 400 })
  }

  const briefing: Briefing = {
    date: typeof body.date === 'string' ? body.date : etDate(),
    updatedAt: new Date().toISOString(),
    markdown,
    fitness: Array.isArray(body.fitness)
      ? (body.fitness.filter((x) => typeof x === 'string') as string[])
      : undefined,
  }

  await setLatestBriefing(briefing)
  return NextResponse.json({ ok: true, date: briefing.date })
}
