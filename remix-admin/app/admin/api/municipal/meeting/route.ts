/**
 * Per-meeting detail for the dashboard's expandable history rows.
 *
 *   GET /admin/api/municipal/meeting?id=<uuid>
 *     → { agendaItems, summary, excerpt, dbOk, dbError }
 *
 * `agendaItems` are parsed bullet points from the meeting's agenda text
 * (title + the specific action, e.g. "Approve"), the preferred display.
 * `summary` is the enrichment summary on meeting.meta when present; `excerpt`
 * is a snippet of the extracted text as a last-resort fallback. Loaded lazily
 * when a row is expanded so the main summary payload stays light.
 */
import { NextResponse } from 'next/server'
import { authorizeMunicipal } from '@/lib/municipal/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface AgendaItem {
  title: string
  action: string | null
}

// Leading verbs that name the specific action taken on an agenda item.
const ACTION_VERBS = [
  'public hearing',
  'approve',
  'adopt',
  'authorize',
  'accept',
  'award',
  'appoint',
  'reappoint',
  'consider',
  'discuss',
  'review',
  'schedule',
  'set',
  'table',
  'refer',
  'grant',
  'deny',
  'approval',
  'resolution',
  'presentation',
  'motion',
  'introduce',
  'ratify',
  'amend',
  'renew',
  'declare',
  'proclaim',
]

// Item numbering / heading markers that begin an agenda line.
const ITEM_MARKER =
  /^\s*(?:\d{1,2}[.)]|[A-Za-z][.)]|[ivxlcdm]{1,5}[.)]|item\s+\d+[:.)]?|agenda\s+item\b|resolution\s+(?:no\.?\s*)?[\w-]+|public\s+hearing\b)\s*/i

// Lines that are structural boilerplate, not agenda business.
const BOILERPLATE =
  /^(town of|village of|city of|board of|agenda\b|minutes\b|page\s*\d|call to order|roll call|adjourn|adjournment|pledge|salute|next meeting|posted|notice|executive session|approval of minutes of|present:|absent:|also present|www\.|http)/i

function parseAgendaItems(text: string): AgendaItem[] {
  if (!text) return []
  const lines = text
    .split(/\r?\n+/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const items: AgendaItem[] = []
  const seen = new Set<string>()

  for (const raw of lines) {
    if (raw.length < 6 || raw.length > 240) continue
    const marked = ITEM_MARKER.test(raw)
    const body = raw.replace(ITEM_MARKER, '').trim()
    if (!body) continue
    if (BOILERPLATE.test(body) || BOILERPLATE.test(raw)) continue
    // Keep numbered items, or unnumbered lines that clearly state an action.
    const lower = body.toLowerCase()
    const verb = ACTION_VERBS.find(
      (v) => lower === v || lower.startsWith(v + ' ') || lower.startsWith(v + ':')
    )
    if (!marked && !verb) continue

    let action: string | null = null
    let title = body
    if (verb) {
      action = verb.replace(/\b\w/g, (c) => c.toUpperCase())
      title = body.slice(verb.length).replace(/^[\s:–-]+/, '').trim() || body
    }
    // Trim trailing page numbers / dot leaders common in PDF agendas.
    title = title.replace(/\.{2,}\s*\d+$/, '').replace(/\s+\d+$/, (m) => (title.length - m.length < 12 ? m : '')).trim()
    if (title.length < 3) continue

    const key = (action || '') + '|' + title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ title: title.slice(0, 200), action })
    if (items.length >= 30) break
  }
  return items
}

export async function GET(req: Request) {
  if (!(await authorizeMunicipal())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  let agendaItems: AgendaItem[] = []
  let summary: string | null = null
  let excerpt: string | null = null
  let dbOk = false
  let dbError: string | undefined

  try {
    const { sql } = await import('@/lib/municipal/db')
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const meta = (await sql`SELECT meta FROM meeting WHERE id = ${id}`) as any[]
    const s = meta[0]?.meta?.summary
    summary = typeof s === 'string' && s.trim() ? s.trim() : null

    // Prefer the agenda's own text for the bullet points.
    const agendaRows = (await sql`
      SELECT mt.full_text AS full_text
      FROM meeting_text mt
      JOIN meeting_asset a ON a.id = mt.asset_id
      WHERE mt.meeting_id = ${id} AND a.kind = 'agenda'
      ORDER BY char_length(mt.full_text) DESC
      LIMIT 1
    `) as { full_text: string }[]
    if (agendaRows[0]?.full_text) {
      agendaItems = parseAgendaItems(agendaRows[0].full_text)
    }

    const txt = (await sql`
      SELECT left(full_text, 1400) AS excerpt
      FROM meeting_text
      WHERE meeting_id = ${id}
      ORDER BY (extractor = 'pdf-parse') DESC, char_length(full_text) DESC
      LIMIT 1
    `) as { excerpt: string }[]
    const e = txt[0]?.excerpt
    excerpt = typeof e === 'string' && e.trim() ? e.replace(/\s+/g, ' ').trim() : null
    dbOk = true
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({ agendaItems, summary, excerpt, dbOk, dbError })
}
