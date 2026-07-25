/**
 * Fitness checklist toggle.
 *
 *   POST /admin/api/fitness   (admin session required)
 *   body: { item: string, checked: boolean, date?: "YYYY-MM-DD" }
 *
 * Persists the item's checked state for the day in Redis (source of truth) and
 * mirrors it to the "Food and Protein Log" spreadsheet's fitness tab via a
 * Google Apps Script web app (FITNESS_SHEET_WEBHOOK_URL). The sheet sync is
 * best-effort: if the webhook is unset or fails, the Redis state still stands.
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { etDate, setFitnessItem } from '@/lib/briefing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const item = typeof body.item === 'string' ? body.item : ''
  const checked = body.checked === true
  const date = typeof body.date === 'string' ? body.date : etDate()
  if (!item) return NextResponse.json({ error: 'item required' }, { status: 400 })

  const state = await setFitnessItem(date, item, checked)

  // Best-effort mirror to the Food and Protein Log's fitness tab.
  const hook = process.env.FITNESS_SHEET_WEBHOOK_URL
  if (hook) {
    try {
      await fetch(hook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date,
          item,
          checked,
          email: session.email,
          secret: process.env.FITNESS_SHEET_WEBHOOK_SECRET ?? '',
        }),
      })
    } catch {
      /* non-fatal — Redis remains the source of truth */
    }
  }

  return NextResponse.json({ ok: true, date, state })
}
