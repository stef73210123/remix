/**
 * Board-member profile: one official, with every board / committee they serve
 * on resolved to display names so the profile page can link back to each.
 *
 *   GET /admin/api/municipal/member?muni=nc&id=<officialId>
 *   → { town, member, bodies: [{ key, displayName }], dbOk, dbError? }
 *
 * Town comes from the registry (always available). The member + body
 * memberships are a DB read; 404 if the id isn't found for this town.
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
  const id = url.searchParams.get('id') || ''
  const cfg = findMunicipality(muniKey)
  if (!cfg || !id) {
    return NextResponse.json({ error: 'unknown town or member' }, { status: 404 })
  }

  const town = { key: cfg.key, name: cfg.name, state: cfg.state, county: cfg.county ?? null }
  // Registry lookup so we can resolve body ids → display names without a join.
  const bodyByKey = new Map(cfg.bodies.map((b) => [b.key, b.displayName]))

  try {
    const { sql } = await import('@/lib/municipal/db')

    const rows = (await sql`
      SELECT o.id, o.full_name, o.title, o.kind, o.email, o.active,
             o.created_at, o.updated_at,
             COALESCE((
               SELECT json_agg(b.key ORDER BY b.key)
               FROM body b
               WHERE b.id = ANY(o.body_ids)
             ), '[]'::json) AS body_keys
      FROM official o
      JOIN municipality mun ON mun.id = o.municipality_id AND mun.key = ${muniKey}
      WHERE o.id = ${id}
      LIMIT 1
    `) as Array<{
      id: string
      full_name: string
      title: string | null
      kind: string
      email: string | null
      active: boolean
      created_at: string
      updated_at: string
      body_keys: string[]
    }>

    if (rows.length === 0) {
      return NextResponse.json({ error: 'member not found' }, { status: 404 })
    }

    const r = rows[0]
    const bodies = (r.body_keys || [])
      .filter((k) => bodyByKey.has(k))
      .map((k) => ({ key: k, displayName: bodyByKey.get(k) as string }))

    const member = {
      id: r.id,
      full_name: r.full_name,
      title: r.title,
      kind: r.kind,
      email: r.email,
      active: r.active,
      updated_at: r.updated_at,
    }

    return NextResponse.json({ town, member, bodies, dbOk: true })
  } catch (e) {
    return NextResponse.json(
      { town, member: null, bodies: [], dbOk: false, dbError: e instanceof Error ? e.message : String(e) },
      { status: 200 }
    )
  }
}
