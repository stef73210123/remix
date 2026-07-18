/**
 * POST /admin/api/municipal/ask — backs the "Ask" chat lightbox. Answers a
 * resident's question about their town using a context bundle assembled
 * server-side from the same committed public data shown elsewhere on the
 * site (lib/municipal/askContext.ts), rather than an open-ended model guess
 * or a live web search — keeps answers grounded in what OpenNorthCastle can
 * actually vouch for. No auth: same public-facing, unauthenticated
 * pattern as the contact-form route.
 */
import { NextResponse } from 'next/server'
import { buildAskContext } from '@/lib/municipal/askContext'
import { findMunicipality } from '@/lib/municipal/registry'

export const runtime = 'nodejs'

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-6'
const MAX_QUESTION_LEN = 600
const MAX_HISTORY_TURNS = 6

interface ChatTurn { role: 'user' | 'assistant'; content: string }

interface AnthropicContentBlock { type: string; text?: string }

function systemPrompt(context: string, townName: string): string {
  return `You are "Ask", the assistant embedded in OpenNorthCastle, a free, independent civic-transparency dashboard for ${townName} — not an official Town website.

Answer the resident's question using ONLY the CONTEXT below, which was assembled from OpenNorthCastle's own committed data. Rules:
- If the answer isn't in the context, say so plainly and, if relevant, point to which part of the OpenNorthCastle site (or which Town department) would have it instead. Do not guess or invent figures, names, dates, or policies.
- Keep answers short and direct — a few sentences, not an essay. Use a short bulleted list only when it genuinely helps.
- Cite specific numbers/facts from the context when they answer the question.
- You are not a Town official and cannot take actions (file requests, look up a specific resident's property, etc.) — point residents to the FOIL Request / Report Issue buttons or the relevant department contact for that.
- Never claim something is legally binding or official Town guidance; this is informational only.

CONTEXT:
${context}`
}

export async function POST(req: Request) {
  let body: { muni?: string; question?: string; history?: ChatTurn[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const muniKey = (body.muni || 'nc').trim()
  const question = (body.question || '').trim()
  const history = Array.isArray(body.history) ? body.history : []

  if (!question) {
    return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 })
  }
  if (question.length > MAX_QUESTION_LEN) {
    return NextResponse.json({ error: `Keep questions under ${MAX_QUESTION_LEN} characters.` }, { status: 400 })
  }

  const muni = findMunicipality(muniKey)
  if (!muni) {
    return NextResponse.json({ error: 'Unknown municipality.' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Ask isn’t configured yet — check back soon.' }, { status: 503 })
  }

  const context = buildAskContext(muniKey)
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL

  const trimmedHistory = history
    .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .slice(-MAX_HISTORY_TURNS * 2)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_QUESTION_LEN * 2) }))

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0.3,
        system: systemPrompt(context, muni.name),
        messages: [...trimmedHistory, { role: 'user', content: question }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('ask: anthropic error', res.status, err.slice(0, 300))
      return NextResponse.json({ error: 'Ask is temporarily unavailable.' }, { status: 502 })
    }
    const data = (await res.json()) as { content?: AnthropicContentBlock[] }
    const answer = (data.content || [])
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text as string)
      .join('\n')
      .trim()

    if (!answer) {
      return NextResponse.json({ error: 'Ask is temporarily unavailable.' }, { status: 502 })
    }
    return NextResponse.json({ answer })
  } catch (e) {
    console.error('ask: request failed', e)
    return NextResponse.json({ error: 'Ask is temporarily unavailable.' }, { status: 502 })
  }
}
