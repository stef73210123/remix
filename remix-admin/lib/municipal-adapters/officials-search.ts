/**
 * Officials discovery via the Anthropic web-search tool.
 *
 * Mirrors lib/rfp-adapters/anthropic-search.ts: rather than scraping each
 * town's boards/commissions HTML (brittle, per-site work), we ask the model
 * to search the municipality's official website and return the current
 * members of each board / committee as strict JSON. Roster-first — name,
 * title/role, which body/bodies, and elected/appointed/staff kind. Deeper
 * enrichment (term dates, contact, bio, LinkedIn) is a later milestone.
 *
 * Used by lib/municipal/officials.ts, which resolves body keys → ids and
 * upserts into the `official` table.
 */
import type { DiscoveredOfficial } from './base'
import type { MunicipalityConfig } from '@/lib/municipal/registry'

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

const OFFICIAL_KINDS = ['elected', 'appointed', 'department_head', 'staff'] as const
type OfficialKind = (typeof OFFICIAL_KINDS)[number]

export interface OfficialsSearchResult {
  ok: boolean
  officials: DiscoveredOfficial[]
  fetched: number
  error?: string
}

interface AnthropicContentBlock {
  type: string
  text?: string
}

interface RawOfficial {
  fullName?: unknown
  title?: unknown
  bodyKeys?: unknown
  kind?: unknown
  email?: unknown
  sourceUrl?: unknown
}

function buildBodyPrompt(cfg: MunicipalityConfig, body: MunicipalityConfig['bodies'][number]): string {
  const domains = cfg.domains.join(', ')
  const kindHint = /town board|council/i.test(body.displayName)
    ? 'elected'
    : /clerk|inspector|assessor|attorney|department|receiver|superintendent/i.test(body.displayName)
      ? 'department_head'
      : 'appointed'

  return `Compile the CURRENT roster of the ${body.displayName} for ${cfg.name}, ${cfg.state}${cfg.county ? ` (${cfg.county} County)` : ''}.

Use web search against the town's official website (${domains}) and other authoritative government pages. Read the ${body.displayName}'s own page/roster, AND the town's staff / officials directory and contact pages to find each member's official municipal EMAIL.

Return ONLY a JSON array; one object per current member of this body:
{
  "fullName": "First Last",
  "title": "role on this body: 'Chair' | 'Vice Chair' | 'Member' | 'Alternate' | 'Supervisor' | '' if unknown",
  "bodyKeys": ["${body.key}"],
  "kind": "elected | appointed | department_head | staff",
  "email": "official municipal email if you can find one, else ''",
  "sourceUrl": "the page you found this on"
}

Rules:
  - Only the ${body.displayName}. Set bodyKeys to exactly ["${body.key}"].
  - Typical kind for this body is "${kindHint}" — adjust per person only if clearly different.
  - Work hard to find each member's municipal email from the directory/contact pages, but NEVER invent one — use "" if not found.
  - Do NOT fabricate members. Fewer correct entries beat guesses.
  - No prose, no code fences. Return [] if nothing is found.`
}

function extractJsonArray(text: string): unknown[] {
  let t = text.trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = t.indexOf('[')
  const end = t.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return []
  try {
    const parsed = JSON.parse(t.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function safeStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** One web-search call for a single board; returns its members (or an error). */
async function searchOneBody(
  cfg: MunicipalityConfig,
  body: MunicipalityConfig['bodies'][number],
  key: string,
  model: string,
): Promise<{ officials: DiscoveredOfficial[]; fetched: number; error?: string }> {
  const validKey = body.key
  let raw = ''
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: buildBodyPrompt(cfg, body) }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { officials: [], fetched: 0, error: `HTTP ${res.status}: ${err.slice(0, 200)}` }
    }
    const data = (await res.json()) as { content?: AnthropicContentBlock[] }
    raw = (data.content || [])
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text as string)
      .join('\n')
  } catch (e) {
    return { officials: [], fetched: 0, error: e instanceof Error ? e.message : String(e) }
  }

  const arr = extractJsonArray(raw) as RawOfficial[]
  const officials: DiscoveredOfficial[] = []
  let fetched = 0

  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    fetched++
    const fullName = safeStr(item.fullName)
    if (!fullName || fullName.length < 3 || fullName.length > 120) continue

    const kindRaw = safeStr(item.kind).toLowerCase()
    const kind: OfficialKind = (OFFICIAL_KINDS as readonly string[]).includes(kindRaw)
      ? (kindRaw as OfficialKind)
      : 'appointed'

    officials.push({
      fullName,
      title: safeStr(item.title) || undefined,
      // Trust the body we searched for, regardless of what the model echoed back.
      bodyKeys: [validKey] as DiscoveredOfficial['bodyKeys'],
      kind,
      email: safeStr(item.email) || undefined,
      sourceUrl: safeStr(item.sourceUrl) || (cfg.domains[0] ? `https://${cfg.domains[0]}` : ''),
    })
  }

  return { officials, fetched }
}

/**
 * Discover officials one board at a time — a focused search per body gives far
 * better coverage of the appointed committees (Planning, ZBA, ARB, …) and their
 * emails than a single all-bodies prompt dominated by the elected Town Board.
 */
export async function discoverOfficialsViaSearch(
  cfg: MunicipalityConfig,
): Promise<OfficialsSearchResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return { ok: false, officials: [], fetched: 0, error: 'ANTHROPIC_API_KEY not set' }
  }
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL

  const officials: DiscoveredOfficial[] = []
  let fetched = 0
  const errors: string[] = []

  for (const body of cfg.bodies) {
    const r = await searchOneBody(cfg, body, key, model)
    officials.push(...r.officials)
    fetched += r.fetched
    if (r.error) errors.push(`${body.key}: ${r.error}`)
  }

  return {
    // OK unless every board's search errored.
    ok: errors.length < cfg.bodies.length,
    officials,
    fetched,
    error: errors.length ? errors.join('; ') : undefined,
  }
}
