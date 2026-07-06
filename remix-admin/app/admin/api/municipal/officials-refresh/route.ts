/**
 * Officials enrichment (M2, roster-first) — populate the `official` table so
 * board profile pages show each body's current members.
 *
 * Discovers members via the Anthropic web-search adapter, then upserts them.
 *
 *   GET /admin/api/municipal/officials-refresh            → every town
 *   GET /admin/api/municipal/officials-refresh?muni=nc    → one town
 *
 * Auth: session cookie OR Bearer CRON_SECRET OR Bearer MUNICIPAL_INGEST_TOKEN.
 * Also runs on a monthly cron (see vercel.json).
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipal } from '@/lib/municipal/auth'
import { refreshOfficialsFor } from '@/lib/municipal/officials'
import { health } from '@/lib/municipal/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Web-search discovery runs ~30-60s per town; keep well within the budget.
export const maxDuration = 300

export async function GET(req: Request) {
  if (!(await authorizeMunicipal())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const muni = new URL(req.url).searchParams.get('muni') || undefined

  const dbHealth = await health()
  if (!dbHealth.ok) {
    return NextResponse.json({ ok: false, stage: 'db_health', dbHealth }, { status: 500 })
  }

  try {
    const reports = await refreshOfficialsFor(muni)
    const upserted = reports.reduce((n, r) => n + r.upserted, 0)
    return NextResponse.json({ ok: true, upserted, reports })
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
