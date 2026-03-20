import { NextRequest, NextResponse } from 'next/server'
import { getConfig, upsertConfigKey } from '@/lib/sheets/config'

export const dynamic = 'force-dynamic'

const CONTENT_KEYS = ['tagline', 'description', 'highlights'] as const

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const asset = req.nextUrl.searchParams.get('asset')
  if (!asset) return NextResponse.json({ error: 'asset required' }, { status: 400 })

  const configMap = await getConfig()
  const result: Record<string, string> = {}
  for (const key of CONTENT_KEYS) {
    result[key] = configMap[`${asset}_${key}`] || ''
  }
  return NextResponse.json(result)
}

export async function PATCH(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { asset, tagline, description, highlights } = body
  if (!asset) return NextResponse.json({ error: 'asset required' }, { status: 400 })

  await Promise.all([
    upsertConfigKey(`${asset}_tagline`, tagline || ''),
    upsertConfigKey(`${asset}_description`, description || ''),
    upsertConfigKey(`${asset}_highlights`, highlights || ''),
  ])

  return NextResponse.json({ ok: true })
}
