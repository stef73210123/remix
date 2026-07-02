/**
 * Public read endpoint for the RFP CRM.
 *
 * GET /admin/api/rfps          → all opportunities across all 5 states
 * GET /admin/api/rfps?state=CT → filter to a single state
 *
 * Read-only, session-gated (same as /admin/api/fundraising).
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { listAll, listByState } from '@/lib/rfp-store'
import { STATE_CODES, type StateCode } from '@/lib/opportunities'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const stateParam = (url.searchParams.get('state') || '').toUpperCase()
  const isValidState = (STATE_CODES as string[]).includes(stateParam)

  const opportunities = isValidState
    ? await listByState(stateParam as StateCode)
    : await listAll()

  // Sort: curated tier A > B > C > untiered, then by due date ascending.
  const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2, '': 3 }
  opportunities.sort((a, b) => {
    const ta = tierOrder[a.tier] ?? 3
    const tb = tierOrder[b.tier] ?? 3
    if (ta !== tb) return ta - tb
    return (a.due || '9999').localeCompare(b.due || '9999')
  })

  return NextResponse.json({ opportunities })
}
