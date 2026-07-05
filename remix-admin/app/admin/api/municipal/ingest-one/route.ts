/**
 * M1 proof endpoint — manually ingest the most-recent meeting for a
 * municipality (default: 1 meeting, no transcription).
 *
 * Usage (via curl or browser after logging into /admin/):
 *   GET  /admin/api/municipal/ingest-one?muni=nc
 *   GET  /admin/api/municipal/ingest-one?muni=rockland
 *   GET  /admin/api/municipal/ingest-one?muni=nc&body=town_board&limit=1
 *
 * Auth mirrors /admin/api/cron/rfp-ingest: Vercel Cron header OR admin session.
 */
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { ingestMunicipality } from '@/lib/municipal/ingest'
import { health } from '@/lib/municipal/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function authorize(): Promise<boolean> {
  const h = await headers()
  const auth = h.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth === `Bearer ${secret}`) return true
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  return !!session
}

export async function GET(req: Request) {
  if (!(await authorize())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const muni = url.searchParams.get('muni') ?? 'nc'
  const body = url.searchParams.get('body') ?? undefined
  const limit = Number(url.searchParams.get('limit') ?? '1')
  const sinceParam = url.searchParams.get('since')
  const since = sinceParam ? new Date(sinceParam) : undefined

  const dbHealth = await health()
  if (!dbHealth.ok) {
    return NextResponse.json(
      { ok: false, stage: 'db_health', dbHealth },
      { status: 500 },
    )
  }

  try {
    const report = await ingestMunicipality({
      muniKey: muni,
      since,
      limit,
      bodyKeys: body ? [body] : undefined,
    })
    return NextResponse.json({ ok: true, muni, dbHealth, report })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        muni,
        dbHealth,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  return GET(req)
}
