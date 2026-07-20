/**
 * Read endpoint for the OpenDocket municipal directory.
 *
 *   GET /admin/api/opendocket → { contacts }
 *
 * Session-gated (same as the other admin data routes). The dataset is static
 * and bundled, so this is a straight pass-through.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { OPEN_DOCKET_CONTACTS } from '@/lib/opendocket'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ contacts: OPEN_DOCKET_CONTACTS })
}
