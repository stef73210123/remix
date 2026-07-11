/**
 * Raw meeting transcript for a board.
 *
 *   GET /admin/api/municipal/transcript?muni=nc&body=planning
 *     → { dates: string[] }                       (available transcript dates)
 *   GET /admin/api/municipal/transcript?muni=nc&body=planning&date=2025-07-14
 *     → text/plain body                            (the raw transcript)
 *
 * Transcripts are un-diarized ASR text committed under lib/municipal/data.
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipalRead } from '@/lib/municipal/auth'
import { listTranscriptDates, loadTranscript } from '@/lib/municipal/analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await authorizeMunicipalRead())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const muni = url.searchParams.get('muni') || ''
  const body = url.searchParams.get('body') || ''
  const date = url.searchParams.get('date')

  if (!date) {
    return NextResponse.json({ dates: listTranscriptDates(muni, body) })
  }

  const text = loadTranscript(muni, body, date)
  if (text == null) {
    return NextResponse.json({ error: 'transcript not found' }, { status: 404 })
  }
  return new NextResponse(text, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
