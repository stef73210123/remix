/**
 * Polyglot municipal-adapter interface.
 *
 * Every adapter returns to the same schema. The ingest pipeline never
 * branches on jurisdiction — it iterates the municipality's declared
 * `sources` and dispatches to the named adapter.
 *
 * Design mirrors `lib/rfp-adapters/base.ts`: shared `politeFetch` with a
 * per-host 2-second throttle, realistic UA, robots.txt awareness.
 *
 * NOTE on runtime: adapters run in the Node runtime (Vercel functions
 * with `runtime = 'nodejs'`). They must NOT block for > 60s per host so
 * a single meeting ingest stays within a serverless function budget.
 */

export type BodyKey =
  | 'town_board' | 'planning' | 'zba' | 'arb'
  | 'conservation' | 'open_space' | 'ethics' | 'recreation'
  | 'ny_forward' | 'other'

export type AssetKind =
  | 'agenda' | 'minutes' | 'staff_report' | 'exhibit'
  | 'video_mp4' | 'captions_vtt' | 'captions_srt' | 'audio_mp3' | 'other'

export interface DiscoveredMeeting {
  bodyKey: BodyKey
  scheduledAt: Date
  title?: string
  location?: string
  /** Stable source-scoped id. Examples: `granicus:clip:2725`, `wp:/uploads/2024/10/Oct-17.pdf`. */
  sourceRef: string
  sourceUrl?: string
  externalUrls: Partial<Record<AssetKind, string>>
  /** Free-form adapter-specific data (e.g. granicus event_id). */
  meta?: Record<string, unknown>
}

export interface DiscoveredCodeChapter {
  title: string
  sourceUrl: string
  text: string
  chapterNumber?: string
  meta?: Record<string, unknown>
}

export interface DiscoveredOfficial {
  fullName: string
  title?: string
  bodyKeys?: BodyKey[]
  kind?: 'elected' | 'appointed' | 'department_head' | 'staff'
  phone?: string
  email?: string
  bio?: string
  photoUrl?: string
  sourceUrl: string
}

export interface FetchedAsset {
  content: Buffer
  contentType: string
  sha256: string
}

export interface MunicipalAdapter {
  /** Stable adapter key, matches `AdapterKey` union in registry.ts. */
  key: string
  /** Adapter-specific display name for logs / dashboards. */
  displayName: string
  /**
   * Return a stream of meetings discovered since `since`.
   *
   * Adapters should:
   *   - Yield meetings scheduled up to the date they discover; caller
   *     will diff against DB by `sourceRef`.
   *   - Not fetch large assets here — only lightweight listing.
   *   - Throttle themselves (via `politeFetch`).
   */
  discoverMeetings(
    ctx: AdapterContext,
    since?: Date,
  ): AsyncIterable<DiscoveredMeeting>

  /** Fetch a single asset (PDF / MP4 / captions). */
  fetchAsset(url: string): Promise<FetchedAsset>

  /** Optional: enumerate code chapters for a book id. */
  fetchCodeChapters?(
    ctx: AdapterContext,
    bookId: string,
  ): AsyncIterable<DiscoveredCodeChapter>

  /** Optional: enumerate officials seeded from town-site pages. */
  fetchOfficials?(ctx: AdapterContext): AsyncIterable<DiscoveredOfficial>
}

/** Context handed to every adapter call: municipality-scoped config. */
export interface AdapterContext {
  muniKey: string
  domains: string[]
  bodies: Array<{ key: BodyKey; civicPlusAgendaId?: number; granicusViewId?: number; meta?: Record<string, unknown> }>
}

// ── Polite HTTP ─────────────────────────────────────────────────────────

export const USER_AGENT =
  'RemixMunicipalBot/0.1 (+https://remixcre.com/bot; stefan@remix.properties)'

const lastRequestByHost = new Map<string, number>()
const MIN_INTERVAL_MS = 2000
const JITTER_MS = 500

export async function politeFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const host = new URL(url).host
  const last = lastRequestByHost.get(host) ?? 0
  const wait = Math.max(0, last + MIN_INTERVAL_MS - Date.now())
  const jitter = Math.random() * JITTER_MS
  if (wait + jitter > 0) {
    await new Promise((res) => setTimeout(res, wait + jitter))
  }
  lastRequestByHost.set(host, Date.now())

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(init.headers || {}),
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function politeFetchBuffer(url: string): Promise<FetchedAsset> {
  const res = await politeFetch(url)
  if (!res.ok) throw new Error(`fetch ${url}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { createHash } = await import('crypto')
  return {
    content: buf,
    contentType: res.headers.get('content-type') ?? 'application/octet-stream',
    sha256: createHash('sha256').update(buf).digest('hex'),
  }
}

/** Simple in-memory robots.txt gate. Refresh per host per day. */
const robotsCache = new Map<string, { allowed: boolean; ts: number }>()
const ROBOTS_TTL_MS = 24 * 3600 * 1000

export async function robotsAllows(url: string): Promise<boolean> {
  const host = new URL(url).host
  const now = Date.now()
  const cached = robotsCache.get(host)
  if (cached && now - cached.ts < ROBOTS_TTL_MS) return cached.allowed
  try {
    const res = await fetch(`https://${host}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    })
    const body = res.ok ? (await res.text()).toLowerCase() : ''
    // Very lightweight: disallow if any Disallow: / block targets our UA or *.
    const blocked = /user-agent:\s*(remixmunicipalbot|\*)\s*[\s\S]*?disallow:\s*\/\s*(\n|$)/i.test(body)
    const allowed = !blocked
    robotsCache.set(host, { allowed, ts: now })
    return allowed
  } catch {
    robotsCache.set(host, { allowed: true, ts: now })
    return true
  }
}
