/**
 * Weekly multi-state RFP ingest.
 *
 * Schedule: Monday 5:00am ET (`0 10 * * 1` UTC, wired in vercel.json).
 *
 * Auth mirrors /admin/api/cron/job-scan — Vercel Cron sends
 * "Authorization: Bearer $CRON_SECRET". A logged-in admin session may also
 * trigger it manually for testing / backfill:
 *   GET /admin/api/cron/rfp-ingest         → sweep all 5 states
 *   GET /admin/api/cron/rfp-ingest?state=CT → single state (comma-sep OK)
 */
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { runIngest } from '@/lib/rfp-adapters'
import { STATE_CODES, type StateCode } from '@/lib/opportunities'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Web-searched adapters can run 30–60s each; PrimeFaces scrapes are quick.
// Parallel Promise.allSettled keeps total wall time bounded by the slowest.
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

function parseStates(param: string | null): StateCode[] | undefined {
  if (!param) return undefined
  const raw = param.toUpperCase().split(',').map((s) => s.trim())
  const valid: StateCode[] = []
  for (const s of raw) {
    if ((STATE_CODES as string[]).includes(s)) valid.push(s as StateCode)
  }
  return valid.length > 0 ? valid : undefined
}

export async function GET(req: Request) {
  if (!(await authorize())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const only = parseStates(url.searchParams.get('state'))
  const report = await runIngest(only)
  return NextResponse.json(report)
}

export async function POST(req: Request) {
  return GET(req)
}
