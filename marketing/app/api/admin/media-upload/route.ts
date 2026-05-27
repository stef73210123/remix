import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/storage/r2'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `media/${Date.now()}-${sanitizedName}`

  await uploadToR2(key, buffer, file.type || 'application/octet-stream')

  return NextResponse.json({
    key,
    url: `/api/media?key=${encodeURIComponent(key)}`,
  })
}
