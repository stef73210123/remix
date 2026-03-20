import { NextRequest, NextResponse } from 'next/server'
import { getAllDocuments } from '@/lib/sheets/documents'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const documents = await getAllDocuments()
  return NextResponse.json({ documents })
}
