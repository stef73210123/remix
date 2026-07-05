/**
 * DB health probe for the municipal stack.
 *
 * GET /admin/api/municipal/health
 *   → { ok, version, extensions: ['vector', 'postgis', ...] }
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipal } from '@/lib/municipal/auth'
import { health } from '@/lib/municipal/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await authorizeMunicipal())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const h = await health()
  return NextResponse.json(h, { status: h.ok ? 200 : 500 })
}
