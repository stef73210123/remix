/**
 * Read endpoint powering the Municipal dashboard UI.
 *
 * GET /admin/api/municipal/summary
 *   → {
 *       municipalities: [ { key, name, state, county, domains, bodies[] } ],
 *       meetings:       [ recent ingested meetings, newest first ],
 *       counts:         { [muniKey]: { meetings, lastMeetingAt } },
 *       dbOk, dbError
 *     }
 *
 * The municipality list comes from the registry, so the dashboard renders the
 * configured towns even before any ingest has run (or when the DB env is
 * absent, e.g. a preview deploy without NEON_DATABASE_URL). Ingested meetings
 * are a best-effort DB read layered on top.
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipal } from '@/lib/municipal/auth'
import { MUNICIPALITIES } from '@/lib/municipal/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface MeetingRow {
  id: string
  muni_key: string
  muni_name: string
  state: string
  county: string | null
  body_name: string
  body_key: string
  scheduled_at: string
  status: string
  title: string | null
  source_url: string | null
  asset_count: number
  text_count: number
}

export async function GET() {
  if (!(await authorizeMunicipal())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const municipalities = MUNICIPALITIES.map((m) => ({
    key: m.key,
    name: m.name,
    state: m.state,
    county: m.county ?? null,
    domains: m.domains,
    bodies: m.bodies.map((b) => ({
      key: b.key,
      displayName: b.displayName,
      meetingPattern: b.meetingPattern ?? null,
    })),
  }))

  let dbOk = false
  let dbError: string | undefined
  let meetings: MeetingRow[] = []
  const counts: Record<string, { meetings: number; lastMeetingAt: string | null }> = {}

  try {
    // Imported lazily: lib/municipal/db throws at module load when
    // NEON_DATABASE_URL is unset, which must not take down this route.
    const { sql } = await import('@/lib/municipal/db')
    meetings = (await sql`
      SELECT m.id,
             mun.key   AS muni_key,
             mun.name  AS muni_name,
             mun.state AS state,
             mun.county AS county,
             b.display_name AS body_name,
             b.key          AS body_key,
             m.scheduled_at AS scheduled_at,
             m.status       AS status,
             m.title        AS title,
             m.source_url   AS source_url,
             (SELECT count(*)::int FROM meeting_asset a WHERE a.meeting_id = m.id) AS asset_count,
             (SELECT count(*)::int FROM meeting_text  t WHERE t.meeting_id = m.id) AS text_count
      FROM meeting m
      JOIN municipality mun ON mun.id = m.municipality_id
      JOIN body b           ON b.id  = m.body_id
      ORDER BY m.scheduled_at DESC
      LIMIT 200
    `) as MeetingRow[]
    dbOk = true

    // Rows are newest-first, so the first sighting per town is its latest meeting.
    for (const r of meetings) {
      const c = counts[r.muni_key] ?? { meetings: 0, lastMeetingAt: null }
      c.meetings++
      if (!c.lastMeetingAt) c.lastMeetingAt = r.scheduled_at
      counts[r.muni_key] = c
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({ municipalities, meetings, counts, dbOk, dbError })
}
