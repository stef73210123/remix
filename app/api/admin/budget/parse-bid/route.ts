import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import { getUser } from '@/lib/sheets/users'

export const dynamic = 'force-dynamic'

async function requireAdmin(): Promise<{ email: string } | NextResponse> {
  const headersList = await headers()
  const email = headersList.get('x-user-email')
  const role = headersList.get('x-user-role')
  if (!email || role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await getUser(email)
  if (!user || !user.active || user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email }
}

export interface ParsedBidItem {
  category: string
  description: string
  amount: number
  unit: string | null
  quantity: number | null
}

export interface ParsedBid {
  vendor: string
  fileName: string
  total: number
  items: ParsedBidItem[]
  raw_summary?: string
}

const SYSTEM_PROMPT = `You are a construction and renovation cost estimator. You parse vendor quotes and contractor bids into structured line items.

For each document provided, extract all cost line items and return structured JSON.

Categorize each item into one of these categories:
- "Site Work" (excavation, grading, utilities, landscaping)
- "Foundation & Structure" (concrete, steel, framing)
- "Exterior" (roofing, siding, windows, doors)
- "Interior Finishes" (flooring, paint, ceilings, millwork)
- "MEP" (mechanical, electrical, plumbing, HVAC)
- "FF&E" (furniture, fixtures, equipment)
- "Kitchen Equipment" (commercial kitchen, bar equipment)
- "Technology & AV" (POS, sound, security, WiFi)
- "Permits & Fees" (permits, inspections, fees)
- "Soft Costs" (architecture, engineering, consulting)
- "Contingency" (allowances, contingencies)
- "General Conditions" (GC overhead, supervision, insurance)
- "Other" (anything that doesn't fit above)

Return ONLY valid JSON in this exact format (no explanation):
{
  "vendor": "vendor or contractor name, or 'Unknown' if not found",
  "total": <total dollar amount as number>,
  "items": [
    {
      "category": "<one of the categories above>",
      "description": "<specific work description>",
      "amount": <dollar amount as number>,
      "unit": "<unit such as SF, LF, each, LS, or null>",
      "quantity": <quantity as number or null>
    }
  ]
}

Important:
- All amounts must be numbers (no currency symbols)
- Exclude taxes unless explicitly included in the bid total
- If a line item is a lump sum, set unit to "LS" and quantity to 1
- Round amounts to nearest dollar
- Group very minor line items under their category if they are sub-items`

async function parseOneFile(
  client: Anthropic,
  fileName: string,
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<ParsedBid> {
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
  const isText = !isPdf && (mimeType.startsWith('text/') || mimeType === 'application/json' || fileName.endsWith('.csv') || fileName.endsWith('.txt'))

  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

  const contentBlocks: ContentBlock[] = []

  if (isPdf) {
    const bytes = new Uint8Array(buffer)
    const chunks: string[] = []
    for (let i = 0; i < bytes.length; i += 8192) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
    }
    const b64 = btoa(chunks.join(''))
    contentBlocks.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: b64 },
    })
    contentBlocks.push({
      type: 'text',
      text: `Parse this vendor quote/bid document (file: ${fileName}) and return structured JSON as instructed.`,
    })
  } else if (isText) {
    const text = new TextDecoder().decode(buffer).slice(0, 50000)
    contentBlocks.push({
      type: 'text',
      text: `Parse this vendor quote/bid document and return structured JSON as instructed.\n\nFile: ${fileName}\n\n---\n${text}\n---`,
    })
  } else {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer).slice(0, 50000)
    contentBlocks.push({
      type: 'text',
      text: `Parse this vendor quote/bid document and return structured JSON as instructed.\n\nFile: ${fileName}\n\n---\n${text}\n---`,
    })
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contentBlocks }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text.trim()

  try {
    const data = JSON.parse(jsonStr)
    return {
      vendor: data.vendor || fileName,
      fileName,
      total: Number(data.total) || 0,
      items: (data.items || []).map((item: Record<string, unknown>) => ({
        category: String(item.category || 'Other'),
        description: String(item.description || ''),
        amount: Number(item.amount) || 0,
        unit: item.unit ? String(item.unit) : null,
        quantity: item.quantity != null ? Number(item.quantity) : null,
      })),
    }
  } catch {
    return { vendor: fileName, fileName, total: 0, items: [], raw_summary: text }
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const results: ParsedBid[] = []

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // FormData upload — no base64 overhead in request body
      const formData = await req.formData()
      const files = formData.getAll('files') as File[]

      if (!files.length) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 })
      }

      for (const file of files) {
        const buffer = await file.arrayBuffer()
        const parsed = await parseOneFile(client, file.name, buffer, file.type || 'application/octet-stream')
        results.push(parsed)
      }
    } else {
      // Legacy JSON fallback
      const body = await req.json() as {
        documents: Array<{ fileName: string; content: string; mimeType: string }>
      }
      const documents = body.documents || []

      if (!documents.length) {
        return NextResponse.json({ error: 'No documents provided' }, { status: 400 })
      }

      for (const doc of documents) {
        const isPdf = doc.mimeType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf')
        const isText = !isPdf && (doc.mimeType?.startsWith('text/') || doc.mimeType === 'application/json')

        let buffer: ArrayBuffer
        if (isText) {
          buffer = new TextEncoder().encode(doc.content).buffer as ArrayBuffer
        } else {
          // Decode base64 to buffer
          const binary = atob(doc.content)
          const arr = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
          buffer = arr.buffer as ArrayBuffer
        }

        const parsed = await parseOneFile(client, doc.fileName, buffer, doc.mimeType || 'application/octet-stream')
        results.push(parsed)
      }
    }

    return NextResponse.json({ bids: results })
  } catch (e) {
    console.error('parse-bid error', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
