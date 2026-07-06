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

function buildPrompt(cfg: MunicipalityConfig): string {
  const bodyList = cfg.bodies
    .map((b) => `  - "${b.key}": ${b.displayName}${b.meetingPattern ? ` (${b.meetingPattern})` : ''}`)
    .join('\n')
  const domains = cfg.domains.join(', ')

  return `You are compiling the current roster of every board and committee for ${cfg.name}, ${cfg.state}${cfg.county ? ` (${cfg.county} County)` : ''}.

Use web search against the town's official website (${domains}) and other authoritative government pages. Find the CURRENT members of each of these bodies:

${bodyList}

For each person, return one JSON object:
{
  "fullName": "First Last",
  "title": "their role on that body, e.g. 'Chair', 'Supervisor', 'Member', 'Vice Chair', 'Alternate' — or '' if unknown",
  "bodyKeys": ["one or more of the body keys above that this person currently serves on"],
  "kind": "one of: elected | appointed | department_head | staff",
  "email": "official municipal email if listed, else ''",
  "sourceUrl": "the page you found this on"
}

Guidance:
  - The Town Board / Council (supervisor + council members) are "elected". Planning Board, Zoning Board, Architectural Review, Conservation, and other citizen committees are "appointed". Town department heads (e.g. Town Clerk, Building Inspector) are "department_head"; other paid staff are "staff".
  - If one person sits on multiple listed bodies, return a single object with all of their body keys.
  - Only use the body keys listed above. If someone holds a role that maps to none of them, omit them.
  - Do NOT fabricate. Only include members you can verify via search. Better to return fewer, correct members than to guess.
  - Return ONLY a JSON array (no prose, no code fences). If you find nothing, return [].`
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

export async function discoverOfficialsViaSearch(
  cfg: MunicipalityConfig,
): Promise<OfficialsSearchResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return { ok: false, officials: [], fetched: 0, error: 'ANTHROPIC_API_KEY not set' }
  }

  const validKeys = new Set(cfg.bodies.map((b) => b.key))
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL

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
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
        messages: [{ role: 'user', content: buildPrompt(cfg) }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return {
        ok: false,
        officials: [],
        fetched: 0,
        error: `Anthropic HTTP ${res.status}: ${err.slice(0, 300)}`,
      }
    }
    const data = (await res.json()) as { content?: AnthropicContentBlock[] }
    raw = (data.content || [])
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text as string)
      .join('\n')
  } catch (e) {
    return { ok: false, officials: [], fetched: 0, error: e instanceof Error ? e.message : String(e) }
  }

  const arr = extractJsonArray(raw) as RawOfficial[]
  const officials: DiscoveredOfficial[] = []
  let fetched = 0

  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    fetched++

    const fullName = safeStr(item.fullName)
    if (!fullName || fullName.length < 3 || fullName.length > 120) continue

    const bodyKeys = Array.isArray(item.bodyKeys)
      ? (item.bodyKeys.map(safeStr).filter((k) => validKeys.has(k)) as DiscoveredOfficial['bodyKeys'])
      : []
    if (!bodyKeys || bodyKeys.length === 0) continue

    const kindRaw = safeStr(item.kind).toLowerCase()
    const kind: OfficialKind = (OFFICIAL_KINDS as readonly string[]).includes(kindRaw)
      ? (kindRaw as OfficialKind)
      : 'appointed'

    officials.push({
      fullName,
      title: safeStr(item.title) || undefined,
      bodyKeys,
      kind,
      email: safeStr(item.email) || undefined,
      sourceUrl: safeStr(item.sourceUrl) || (cfg.domains[0] ? `https://${cfg.domains[0]}` : ''),
    })
  }

  return { ok: true, officials, fetched }
}
