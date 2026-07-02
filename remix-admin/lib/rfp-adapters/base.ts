/**
 * State-adapter interface. Each state adapter exports a default object
 * implementing IngestAdapter, and the cron orchestrator calls them all in
 * their own try/catch.
 */
import type { StateCode, Opportunity } from '@/lib/opportunities'
import type { FilterStats } from '@/lib/rfp-filter'

export interface IngestAdapter {
  state: StateCode
  sourceName: string
  /**
   * Fetch, parse, filter, and return normalized records ready to upsert.
   * MUST NOT throw for portal-side failures — return { ok: false, error }.
   * Any thrown error indicates a bug in the adapter itself.
   */
  ingest(): Promise<AdapterResult>
}

export interface AdapterResult {
  ok: boolean
  records: Opportunity[]
  stats: FilterStats
  error?: string
  /** Total rows fetched from the portal before filtering (for rejection-rate math). */
  fetched: number
}

/** Cap per-adapter work to keep the cron under Vercel's maxDuration. */
export const MAX_RECORDS_PER_ADAPTER = 200

/** Polite scraping user-agent — identifies the caller to portal ops. */
export const USER_AGENT =
  'Remix-Admin-RFP-Ingest/1.0 (+https://remixcre.com/admin; stefan@remix.properties)'

/**
 * Rate-limited GET. Enforces a floor of 2s between requests to the same host.
 * (`fetch` is native in Node 18+ / Next runtime.)
 */
const lastRequestByHost = new Map<string, number>()
const MIN_INTERVAL_MS = 2000

export async function politeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const host = new URL(url).host
  const last = lastRequestByHost.get(host) ?? 0
  const wait = Math.max(0, last + MIN_INTERVAL_MS - Date.now())
  if (wait > 0) await new Promise((res) => setTimeout(res, wait))
  lastRequestByHost.set(host, Date.now())

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(init.headers || {}),
      },
    })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Parse a US date string like "07/22/2026" or "7/22/2026 16:00:00" into
 * an ISO date and a display label. Empty strings for un-parseable inputs.
 */
export function parseUsDate(raw: string): { iso: string; label: string } {
  const s = raw.trim()
  if (!s) return { iso: '', label: '' }
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(.+))?$/)
  if (!m) return { iso: '', label: s }
  const [, mo, da, yr, timePart] = m
  const iso = `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`
  const label = timePart ? `${mo}/${da}/${yr}` : `${mo}/${da}/${yr}`
  return { iso, label }
}
