import { NextRequest, NextResponse } from 'next/server'
import { getAllDocuments, appendDocumentRow } from '@/lib/sheets/documents'
import type { DocType, DocVisibility } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const documents = await getAllDocuments()
  return NextResponse.json({ documents })
}

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { email, asset, doc_name, doc_type, r2_key, visible_to } = body
    if (!email || !asset || !doc_name || !r2_key) {
      return NextResponse.json({ error: 'email, asset, doc_name, r2_key are required' }, { status: 400 })
    }
    const doc = await appendDocumentRow({
      email,
      asset,
      doc_name,
      doc_type: (doc_type || 'other') as DocType,
      r2_key,
      date: new Date().toISOString().split('T')[0],
      visible_to: (visible_to || 'lp') as DocVisibility,
    })
    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (e) {
    console.error('[admin/documents POST]', e)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}
