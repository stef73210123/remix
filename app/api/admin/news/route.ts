import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export interface NewsItem {
  id: string
  title: string
  link: string
  source: string
  pubDate: string
  imageUrl: string | null
  topic: string
}

const FEEDS = [
  { url: 'https://news.google.com/rss/search?q=regenerative+agriculture&hl=en-US&gl=US&ceid=US:en', topic: 'Regenerative Agriculture' },
  { url: 'https://news.google.com/rss/search?q=agritourism+farm+stay&hl=en-US&gl=US&ceid=US:en', topic: 'Agritourism' },
  { url: 'https://news.google.com/rss/search?q=catskills+hospitality+hotel&hl=en-US&gl=US&ceid=US:en', topic: 'Catskills' },
  { url: 'https://news.google.com/rss/search?q=westchester+restaurant+fine+dining&hl=en-US&gl=US&ceid=US:en', topic: 'Westchester Dining' },
  { url: 'https://news.google.com/rss/search?q=private+equity+real+estate+hospitality&hl=en-US&gl=US&ceid=US:en', topic: 'Hospitality PE' },
]

function extractImage(description: string): string | null {
  const m = description.match(/<img[^>]+src="([^"]+)"/)
  return m ? m[1] : null
}

function extractText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

function parseItems(xml: string, topic: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = itemRegex.exec(xml)) !== null) {
    const item = m[1]
    const titleRaw =
      item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''
    const link =
      item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ||
      item.match(/<link[^>]+href="([^"]+)"/)?.[1] || ''
    const sourceRaw =
      item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || topic
    const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || ''
    const descRaw =
      item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
      item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || ''

    const title = extractText(titleRaw)
    const source = extractText(sourceRaw)
    const imageUrl = extractImage(descRaw)

    // Remove " - Source Name" suffix Google News adds to titles
    const cleanTitle = title.replace(/\s+[-–]\s+[^-–]+$/, '')

    if (cleanTitle && link) {
      // Use title (not link) for the ID since Google News redirects often share the same URL
      const titleKey = cleanTitle.slice(0, 48).toLowerCase().replace(/[^a-z0-9]/g, '')
      items.push({
        id: `news_${topic.slice(0, 4).replace(/\W/g, '')}_${idx}_${titleKey.slice(0, 20)}`,
        title: cleanTitle,
        link,
        source,
        pubDate,
        imageUrl,
        topic,
      })
      idx++
    }
  }
  return items.slice(0, 6)
}

async function fetchFeed(url: string, topic: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CircularPlatform/1.0)' },
    })
    if (!res.ok) return []
    return parseItems(await res.text(), topic)
  } catch {
    return []
  }
}

export async function GET() {
  const headersList = await headers()
  const role = headersList.get('x-user-role')
  if (role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = await Promise.all(FEEDS.map((f) => fetchFeed(f.url, f.topic)))
  const all = results.flat()

  // Deduplicate by title prefix
  const seen = new Set<string>()
  const deduped = all.filter((item) => {
    const key = item.title.slice(0, 50).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  deduped.sort((a, b) => {
    const da = new Date(a.pubDate).getTime()
    const db = new Date(b.pubDate).getTime()
    return db - da
  })

  return NextResponse.json(deduped)
}
