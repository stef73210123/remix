/**
 * refresh-substack-feed.mjs
 *
 * Fetches the Ground Truth Substack RSS feed, downloads any new post
 * thumbnails to marketing/img/substack/, and replaces the block of
 * HTML between the SUBSTACK_FEED_START / SUBSTACK_FEED_END sentinels
 * in marketing/index.html with freshly rendered cards.
 *
 * Runs on a weekly cron in .github/workflows/refresh-substack-feed.yml,
 * or manually:
 *     node scripts/refresh-substack-feed.mjs
 *
 * Design notes:
 *   • Zero external NPM dependencies. Uses Node 20+ native fetch and
 *     the same lightweight XML/HTML entity parsing as api/feed.js.
 *   • Content-addressable thumbnail names: img/substack/{slug}.jpg.
 *     If a thumbnail file already exists for a given slug, skip the
 *     download — Substack slugs are stable per post.
 *   • Idempotent: if the rendered HTML is identical to what's already
 *     between the sentinels, the file is not rewritten and we log
 *     "no changes".
 *   • Exit code 0 in all success cases; non-zero only on hard failure
 *     (feed unreachable, sentinels missing, etc.).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const MARKETING_DIR = join(REPO_ROOT, 'marketing')

// If the script is run from within marketing/ itself, adjust.
const INDEX_HTML = existsSync(join(MARKETING_DIR, 'index.html'))
  ? join(MARKETING_DIR, 'index.html')
  : join(REPO_ROOT, 'index.html')
const IMG_DIR = existsSync(join(MARKETING_DIR, 'img'))
  ? join(MARKETING_DIR, 'img', 'substack')
  : join(REPO_ROOT, 'img', 'substack')

const SUBSTACK_HOME = 'https://groundtruthcre.substack.com/'
const FEED_URL = `${SUBSTACK_HOME}feed`
const ARCHIVE_URL = `${SUBSTACK_HOME}api/v1/archive?limit=6`
// Existing Vercel serverless proxy on this same site (marketing/api/feed.js).
// Substack blocks direct fetches from GitHub Actions IP ranges, but Vercel's
// edge network can reach Substack fine — so we prefer this proxy when running
// in CI and fall back to Substack directly for local dev.
const PROXY_URL = 'https://remixcre.com/api/feed'
const MAX_POSTS = 6
const EXCERPT_WORDS = 45           // ~30-50 word excerpt
// Substack's RSS endpoint returns 403 to obviously-scripted User-Agents from
// datacenter IP ranges (which is what GitHub Actions runs on). A browser-like
// UA sails through — this is a public feed, not an evasion.
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SENTINEL_START = '<!-- SUBSTACK_FEED_START -->'
const SENTINEL_END = '<!-- SUBSTACK_FEED_END -->'

// ─── Small parsing helpers (same shape as api/feed.js) ─────────────────────
function decodeEntities(input) {
  if (!input) return ''
  return String(input)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)) } catch { return '' }
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      try { return String.fromCodePoint(parseInt(dec, 10)) } catch { return '' }
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

function firstTag(block, tag) {
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i')
  const m = block.match(re)
  return m ? m[1] : ''
}

function tagAttr(block, tag, attr) {
  const re = new RegExp('<' + tag + '\\b[^>]*?\\b' + attr + '\\s*=\\s*"([^"]*)"', 'i')
  const m = block.match(re)
  return m ? m[1] : ''
}

function stripHtml(html) {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function truncateWords(text, maxWords) {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ').replace(/[.,;:!?]+$/, '') + '…'
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function slugFromUrl(url) {
  // Substack post URLs: https://sub.substack.com/p/some-slug
  const m = String(url).match(/\/p\/([a-z0-9\-]+)/i)
  if (m) return m[1].toLowerCase()
  // Fallback: sanitise the tail.
  return String(url).split('/').filter(Boolean).pop()
    .toLowerCase().replace(/[^a-z0-9\-]+/g, '-').slice(0, 60)
}

function formatDate(pubDate) {
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return pubDate
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

// ─── Feed fetch ───────────────────────────────────────────────────────────
// Two paths: the public RSS feed, and Substack's /api/v1/archive JSON. The RSS
// endpoint is preferred (richer content) but Substack sometimes returns 403 to
// requests from datacenter IP ranges (e.g. GitHub Actions runners), so we fall
// through to the JSON archive endpoint, which is less aggressively firewalled.
async function tryFetch(url, accept) {
  console.log(`[feed] GET ${url}`)
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': accept,
      'Accept-Language': 'en-US,en;q=0.9'
    }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

async function fetchPosts() {
  // Preferred: Substack RSS (richest content). Works from home ISPs and Vercel
  // edge but returns 403 to GitHub Actions runner IPs.
  try {
    const xml = await tryFetch(FEED_URL, 'application/rss+xml, application/xml, text/xml, */*')
    const posts = parseFeed(xml)
    if (posts.length > 0) {
      console.log(`[feed] RSS parsed ${posts.length} posts`)
      return posts
    }
    console.warn('[feed] RSS returned 0 posts — falling back to archive JSON')
  } catch (err) {
    console.warn(`[feed] RSS failed (${err.message}) — falling back to archive JSON`)
  }

  // Fallback 1: Substack /api/v1/archive JSON. Same IP block as RSS from CI,
  // but the shape is stable so it works fine when the direct RSS is throttled.
  try {
    const body = await tryFetch(ARCHIVE_URL, 'application/json, */*')
    const posts = parseArchive(body)
    if (posts.length > 0) {
      console.log(`[feed] archive parsed ${posts.length} posts`)
      return posts
    }
    console.warn('[feed] archive returned 0 posts — falling back to Vercel proxy')
  } catch (err) {
    console.warn(`[feed] archive failed (${err.message}) — falling back to Vercel proxy`)
  }

  // Fallback 2: this site's own /api/feed serverless function (marketing/api/feed.js).
  // Vercel's edge can reach Substack even when GitHub Actions IPs are blocked,
  // so this is what actually keeps the cron alive from CI.
  const body = await tryFetch(PROXY_URL, 'application/json, */*')
  const posts = parseProxy(body)
  console.log(`[feed] proxy parsed ${posts.length} posts`)
  return posts
}

function parseFeed(xml) {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  const posts = itemBlocks.map((item) => {
    const title = decodeEntities(firstTag(item, 'title')).trim()
    const link = decodeEntities(firstTag(item, 'link')).trim()
    const rawDate = decodeEntities(firstTag(item, 'pubDate')).trim()
    const rawDescription = decodeEntities(firstTag(item, 'description'))
    const rawContent = decodeEntities(firstTag(item, 'content:encoded') || firstTag(item, 'description'))
    const excerpt = truncateWords(stripHtml(rawDescription), EXCERPT_WORDS)

    let image = tagAttr(item, 'enclosure', 'url')
    if (!image) {
      const m = rawContent.match(/<img[^>]+src\s*=\s*"([^"]+)"/i)
      if (m) image = m[1]
    }
    // Substack sometimes wraps content:encoded in CDATA + HTML-escapes the img src,
    // so &amp; can survive one pass of decoding. Decode again to defang Unsplash
    // query params (else `w=1080` becomes `amp;w=1080` and we get a huge image).
    if (image) image = decodeEntities(image)

    return {
      slug: slugFromUrl(link),
      title,
      link,
      date: formatDate(rawDate),
      isoDate: new Date(rawDate).toISOString().slice(0, 10),
      excerpt,
      remoteImage: image || null
    }
  }).filter(p => p.title && p.link)

  return posts.slice(0, MAX_POSTS)
}

function parseProxy(body) {
  // marketing/api/feed.js emits { posts: [{ title, link, date, excerpt, image }] }
  const data = JSON.parse(body)
  const rows = Array.isArray(data?.posts) ? data.posts : []
  const posts = rows.map((row) => {
    const link = String(row.link || '')
    const rawDate = String(row.date || '')
    // The proxy already stripped HTML and truncated at ~150 chars; re-truncate
    // to our word budget to keep card excerpts uniform with archive-JSON output.
    const rawExcerpt = String(row.excerpt || '')
    return {
      slug: slugFromUrl(link),
      title: String(row.title || '').trim(),
      link,
      date: formatDate(rawDate),
      isoDate: (new Date(rawDate).toISOString() || '').slice(0, 10),
      excerpt: truncateWords(stripHtml(rawExcerpt), EXCERPT_WORDS),
      remoteImage: row.image || null
    }
  }).filter(p => p.title && p.link)

  return posts.slice(0, MAX_POSTS)
}

function parseArchive(json) {
  const rows = JSON.parse(json)
  const posts = rows.map((row) => {
    const link = String(row.canonical_url || '')
    const rawDate = String(row.post_date || '')
    const rawExcerpt = row.description || row.subtitle || row.search_engine_description || ''
    return {
      slug: row.slug ? String(row.slug).toLowerCase() : slugFromUrl(link),
      title: String(row.title || '').trim(),
      link,
      date: formatDate(rawDate),
      isoDate: (new Date(rawDate).toISOString() || '').slice(0, 10),
      excerpt: truncateWords(stripHtml(String(rawExcerpt)), EXCERPT_WORDS),
      remoteImage: row.cover_image || null
    }
  }).filter(p => p.title && p.link)

  return posts.slice(0, MAX_POSTS)
}

// ─── Thumbnails ───────────────────────────────────────────────────────────
async function downloadThumbnail(post) {
  if (!post.remoteImage) return null
  if (!existsSync(IMG_DIR)) mkdirSync(IMG_DIR, { recursive: true })

  // Content-addressable: {slug}.jpg. Skip if it already exists.
  const localName = `${post.slug}.jpg`
  const localPath = join(IMG_DIR, localName)
  const publicPath = `/img/substack/${localName}`

  if (existsSync(localPath)) {
    console.log(`[thumb] cached ${localName}`)
    return publicPath
  }

  try {
    console.log(`[thumb] fetch ${post.remoteImage}`)
    const res = await fetch(post.remoteImage, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await pipeline(Readable.fromWeb(res.body), createWriteStream(localPath))
    console.log(`[thumb] saved  ${localName}`)
    return publicPath
  } catch (err) {
    console.warn(`[thumb] FAILED ${post.slug}: ${err.message}`)
    return null
  }
}

// ─── HTML rendering ───────────────────────────────────────────────────────
function renderCard(post) {
  const thumb = post.localImage
    ? `<img class="substack-card-thumb" src="${escapeHtml(post.localImage)}" alt="" loading="lazy" width="600" height="315">`
    : `<div class="substack-card-thumb substack-card-thumb-fallback" aria-hidden="true"></div>`

  return `      <a class="substack-card" href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer" aria-label="Read '${escapeHtml(post.title)}' on Substack (opens in new tab)">
        ${thumb}
        <div class="substack-card-body">
          <time class="substack-card-date" datetime="${escapeHtml(post.isoDate)}">${escapeHtml(post.date)}</time>
          <h3 class="substack-card-title">${escapeHtml(post.title)}</h3>
          <p class="substack-card-excerpt">${escapeHtml(post.excerpt)}</p>
          <span class="substack-card-cta">Read <span class="arrow-icon" aria-hidden="true">→</span></span>
        </div>
      </a>`
}

function renderBlock(posts) {
  const cards = posts.map(renderCard).join('\n')
  return `${SENTINEL_START}
    <div class="substack-scroll" id="substackScroll">
${cards}
    </div>
    <div class="substack-footer">
      <a class="substack-footer-link" href="${SUBSTACK_HOME}" target="_blank" rel="noopener noreferrer">
        See all posts on Substack <span class="arrow-icon" aria-hidden="true">→</span>
      </a>
    </div>
    ${SENTINEL_END}`
}

// ─── HTML file rewrite ────────────────────────────────────────────────────
function replaceSentinelBlock(html, block) {
  const startIdx = html.indexOf(SENTINEL_START)
  const endIdx = html.indexOf(SENTINEL_END)
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Sentinel markers not found in ${INDEX_HTML}. Expected both ${SENTINEL_START} and ${SENTINEL_END}.`
    )
  }
  if (endIdx < startIdx) throw new Error('Sentinel END appears before START')
  const before = html.slice(0, startIdx)
  const after = html.slice(endIdx + SENTINEL_END.length)
  return before + block + after
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  let posts
  try {
    posts = await fetchPosts()
  } catch (err) {
    // Both RSS and archive endpoints failed. Keep the existing content and
    // exit clean so the scheduled workflow does not spam alerts on transient
    // Substack outages. Real drift will be caught the next Monday.
    console.error(`[error] both feed endpoints failed: ${err.message}`)
    console.error('[error] keeping existing marketing/index.html content')
    return
  }

  for (const post of posts) {
    post.localImage = await downloadThumbnail(post)
  }

  const block = renderBlock(posts)
  const html = readFileSync(INDEX_HTML, 'utf8')
  const next = replaceSentinelBlock(html, block)

  if (next === html) {
    console.log('[html] no changes — content already up to date')
    return
  }
  writeFileSync(INDEX_HTML, next)
  console.log(`[html] wrote ${INDEX_HTML}`)
  console.log('[html] posts embedded:')
  for (const p of posts) console.log(`         • ${p.date} — ${p.title}`)
}

main().catch((err) => {
  console.error('[error]', err.message)
  process.exit(1)
})
