import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getMeta(html: string, ...names: string[]): string {
  for (const name of names) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]?.trim()) return m[1].trim()
    }
  }
  return ''
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Missing or invalid url' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CircularBot/1.0; +https://circular.enterprises)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    if (!res.ok) return NextResponse.json({ error: 'Could not fetch URL' }, { status: 502 })

    const html = await res.text()

    const title = getMeta(html, 'og:title', 'twitter:title')
      || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
      || ''

    const description = getMeta(html, 'og:description', 'twitter:description', 'description')
    const image = getMeta(html, 'og:image', 'twitter:image:src', 'twitter:image')
    const siteName = getMeta(html, 'og:site_name')
      || (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } })()

    return NextResponse.json(
      { title, description, image, siteName, url },
      { headers: { 'Cache-Control': 's-maxage=3600' } },
    )
  } catch {
    return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 502 })
  }
}
