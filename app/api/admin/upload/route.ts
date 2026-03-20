import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/storage/r2'
import { appendDocumentRow } from '@/lib/sheets/documents'
import type { DocType, DocVisibility } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role')

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const asset = formData.get('asset') as string
  const docName = formData.get('doc_name') as string
  const docType = formData.get('doc_type') as DocType
  const visibleTo = formData.get('visible_to') as DocVisibility
  const email = (formData.get('email') as string) || 'all'

  if (!file || !asset || !docName || !docType || !visibleTo) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const r2Key = `${asset}/${Date.now()}-${sanitizedName}`
  const date = new Date().toISOString().split('T')[0]

  await uploadToR2(r2Key, buffer, file.type || 'application/octet-stream')

  const doc = await appendDocumentRow({ email, asset, doc_name: docName, doc_type: docType, r2_key: r2Key, date, visible_to: visibleTo })

  return NextResponse.json({ success: true, document: doc })
}
