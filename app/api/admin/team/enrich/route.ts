import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

function isAdmin(req: NextRequest) {
  return req.headers.get('x-user-role') === 'admin'
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { url } = await req.json() as { url: string }
    if (!url?.startsWith('http')) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })

    // Fetch the page
    const pageRes = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CircularBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!pageRes.ok) return NextResponse.json({ error: 'Could not fetch URL' }, { status: 502 })

    const html = await pageRes.text()
    // Trim HTML to avoid huge token counts
    const trimmed = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').slice(0, 40000)

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a web scraper that extracts firm/company information from HTML. Return ONLY valid JSON, no explanation.`,
      messages: [{
        role: 'user',
        content: `Extract information about this firm/company from the following HTML. Return JSON with these fields:
- name: firm name (string)
- description: 2-4 sentence description of what they do (string)
- logo_url: absolute URL of their logo image (string, from og:image, apple-touch-icon, or a logo img tag — prefer SVG/PNG over JPG)
- images: array of up to 6 absolute image URLs showing their work/projects (string[])
- website: canonical homepage URL (string)

For images, look for project portfolio images, work showcase images, or hero images.
Make all image URLs absolute (prepend ${new URL(url).origin} if relative).

URL: ${url}

HTML:
---
${trimmed}
---

Return only JSON, no markdown.`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
    const jsonStr = jsonMatch[1] || text

    let data: Record<string, unknown>
    try {
      data = JSON.parse(jsonStr)
    } catch {
      data = {}
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('[team/enrich]', e)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
