/**
 * Board profile data: one board's meetings, members and open files.
 *
 *   GET /admin/api/municipal/board?muni=nc&body=town_board
 *
 * Town + board come from the registry (always available). Meetings, members
 * (officials) and openFiles (non-final matters) are a best-effort DB read;
 * members/openFiles stay empty until the M2 enrichment populates them.
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { findMunicipality } from '@/lib/municipal/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const muniKey = url.searchParams.get('muni') || ''
  const bodyKey = url.searchParams.get('body') || ''
  const cfg = findMunicipality(muniKey)
  const body = cfg?.bodies.find((b) => b.key === bodyKey)
  if (!cfg || !body) {
    return NextResponse.json({ error: 'unknown town or board' }, { status: 404 })
  }

  const town = { key: cfg.key, name: cfg.name, state: cfg.state, county: cfg.county ?? null }
  const board = { key: body.key, displayName: body.displayName, meetingPattern: body.meetingPattern ?? null }

  let dbOk = false
  let dbError: string | undefined
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let meetings: any[] = []
  let members: any[] = []
  let openFiles: any[] = []

  try {
    const { sql } = await import('@/lib/municipal/db')

    meetings = (await sql`
      SELECT m.id, m.scheduled_at, m.status, m.title, m.source_url,
             COALESCE((
               SELECT json_agg(json_build_object(
                        'kind', a.kind, 'sourceUrl', a.source_url,
                        'blobUrl', a.blob_url, 'pageCount', a.page_count
                      ) ORDER BY a.kind)
               FROM meeting_asset a WHERE a.meeting_id = m.id
             ), '[]'::json) AS assets,
             (SELECT count(*)::int FROM meeting_text t WHERE t.meeting_id = m.id) AS text_count
      FROM meeting m
      JOIN municipality mun ON mun.id = m.municipality_id AND mun.key = ${muniKey}
      JOIN body b           ON b.id  = m.body_id AND b.key = ${bodyKey}
      ORDER BY m.scheduled_at DESC
      LIMIT 200
    `) as any[]

    members = (await sql`
      SELECT o.id, o.full_name, o.title, o.kind, o.email, o.active
      FROM official o
      JOIN municipality mun ON mun.id = o.municipality_id AND mun.key = ${muniKey}
      WHERE o.active
        AND o.body_ids @> ARRAY[(
          SELECT b.id FROM body b WHERE b.municipality_id = mun.id AND b.key = ${bodyKey}
        )]
      ORDER BY o.full_name
    `) as any[]

    openFiles = (await sql`
      SELECT id, kind, subject, applicant_name, status, application_date, decision_date
      FROM matter
      WHERE municipality_id = (SELECT id FROM municipality WHERE key = ${muniKey})
        AND status NOT IN ('approved', 'denied', 'withdrawn')
      ORDER BY last_seen_at DESC
      LIMIT 100
    `) as any[]

    dbOk = true
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({ town, board, meetings, members, openFiles, dbOk, dbError })
}
