import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/storage/r2'
import { appendDocumentRow } from '@/lib/sheets/documents'
import type { DocType, DocVisibility } from '@/types'

export const dynamic = 'force-dynamic'

async function downloadFromDrive(fileId: string, accessToken: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Drive download failed (${res.status}): ${text}`)
  }
  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, contentType }
}

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role')

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()

  const asset = formData.get('asset') as string
  const docName = formData.get('doc_name') as string
  const docType = formData.get('doc_type') as DocType
  const visibleTo = formData.get('visible_to') as DocVisibility
  const email = (formData.get('email') as string) || 'all'

  if (!asset || !docName || !docType || !visibleTo) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const date = new Date().toISOString().split('T')[0]

  // ── Drive file ───────────────────────────────────────────────────────────────
  const driveFileId = formData.get('driveFileId') as string | null
  const driveAccessToken = formData.get('driveAccessToken') as string | null
  const driveFileName = (formData.get('driveFileName') as string) || 'document'

  if (driveFileId && driveAccessToken) {
    try {
      const { buffer, contentType } = await downloadFromDrive(driveFileId, driveAccessToken)
      const sanitizedName = driveFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const r2Key = `${asset}/${Date.now()}-${sanitizedName}`
      await uploadToR2(r2Key, buffer, contentType)
      const doc = await appendDocumentRow({ email, asset, doc_name: docName, doc_type: docType, r2_key: r2Key, date, visible_to: visibleTo })
      return NextResponse.json({ success: true, document: doc })
    } catch (err) {
      console.error('[admin/upload Drive]', err)
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Drive upload failed' }, { status: 500 })
    }
  }

  // ── File upload ──────────────────────────────────────────────────────────────
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Missing file or driveFileId' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const r2Key = `${asset}/${Date.now()}-${sanitizedName}`

  await uploadToR2(r2Key, buffer, file.type || 'application/octet-stream')

  const doc = await appendDocumentRow({ email, asset, doc_name: docName, doc_type: docType, r2_key: r2Key, date, visible_to: visibleTo })

  return NextResponse.json({ success: true, document: doc })
}
