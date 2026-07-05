/**
 * DB health probe for the municipal stack.
 *
 * GET /admin/api/municipal/health
 *   → { ok, version, extensions: ['vector', 'postgis', ...] }
 *
 * Handy for validating that Neon is reachable + extensions are enabled
 * before running the first ingest.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { health } from '@/lib/municipal/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const h = await health()
  return NextResponse.json(h, { status: h.ok ? 200 : 500 })
}
