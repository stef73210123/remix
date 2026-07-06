/**
 * Delete ingested meetings for a municipality by source-ref prefix.
 *
 * Used to clean up rows written by a superseded adapter — e.g. the CivicPlus
 * AgendaCenter rows ("civicplus:…") that attached the wrong board's documents
 * before North Castle was moved to the CivicClerk adapter ("civicclerk:…").
 *
 *   GET /admin/api/municipal/purge?muni=nc&sourcePrefix=civicplus:
 *
 * Meeting deletes cascade to their assets and extracted text. Auth: same as
 * the other municipal endpoints (session cookie / bearer token).
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipal } from '@/lib/municipal/auth'
import { sql } from '@/lib/municipal/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipal())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const muni = url.searchParams.get('muni')
  const prefix = url.searchParams.get('sourcePrefix')
  if (!muni || !prefix) {
    return NextResponse.json(
      { error: 'muni and sourcePrefix are required' },
      { status: 400 },
    )
  }

  try {
    const rows = (await sql`
      DELETE FROM meeting
      WHERE municipality_id = (SELECT id FROM municipality WHERE key = ${muni})
        AND source_ref LIKE ${prefix + '%'}
      RETURNING id
    `) as Array<{ id: string }>
    return NextResponse.json({ ok: true, muni, sourcePrefix: prefix, deleted: rows.length })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  return GET(req)
}
