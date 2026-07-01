import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { runJobScan } from '@/lib/job-scan'
import { appendRowsToSheet } from '@/lib/sheet-write'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Web search + generation can take a while; allow up to 60s.
export const maxDuration = 60

/**
 * Daily cloud Job Scan. Runs from Vercel Cron (see vercel.json) with no laptop:
 *   1. Ask the model (with web search) for NEW firms matching Stefan's profiles.
 *   2. Dedupe against firms already in the sheet.
 *   3. Append the new firms to the sheet (status "Backlog") via the Apps Script
 *      writer, so the admin hub reflects them immediately.
 *
 * Auth: Vercel Cron sends "Authorization: Bearer $CRON_SECRET" automatically
 * when CRON_SECRET is set. A logged-in admin may also trigger it manually
 * (e.g. ?perRun=5) for testing.
 */
async function authorize(): Promise<boolean> {
  const h = await headers()
  const auth = h.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth === `Bearer ${secret}`) return true
  // Fallback: an authenticated admin session (manual test trigger).
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  return !!session
}

async function handle(perRun: number) {
  const scan = await runJobScan(perRun)
  if (!scan.ok) {
    return NextResponse.json({ ok: false, stage: 'scan', error: scan.error }, { status: 502 })
  }
  const append = await appendRowsToSheet(scan.candidates)
  return NextResponse.json({
    ok: append.ok,
    found: scan.candidates.length,
    appended: append.appended,
    firms: scan.candidates.map((c) => `${c.category}: ${c.firm}`),
    ...(append.error ? { appendError: append.error } : {}),
  })
}

export async function GET(req: Request) {
  if (!(await authorize())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const perRun = Math.min(Math.max(Number(url.searchParams.get('perRun')) || 15, 1), 30)
  return handle(perRun)
}

export async function POST(req: Request) {
  return GET(req)
}
