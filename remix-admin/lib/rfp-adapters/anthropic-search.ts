/**
 * Shared adapter for portals whose search results are rendered client-side
 * by JavaScript SPA frameworks (Angular / heavy JS). These portals return
 * only an `<app-root>Loading…</app-root>` shell to server-side fetches, so
 * cheerio-based scraping doesn't work.
 *
 * Instead, we lean on the same pattern that lib/job-scan.ts already uses
 * in this repo: an Anthropic API call with the `web_search_20250305` tool
 * enabled. The model searches the state's public bid board, reads the
 * rendered content, and returns a strict JSON array of records that we
 * validate and pass through the same filter as every other adapter.
 *
 * Portals that use this adapter:
 *   NY — NYSCR (nyscr.ny.gov)
 *   CT — CTsource / Proactis WebProcure
 *   RI — RIDOP / Proactis WebProcure
 */
import type { Opportunity, StateCode } from '@/lib/opportunities'
import { accumulate, emptyStats, matchesFilter } from '@/lib/rfp-filter'
import type { AdapterResult } from './base'

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

export interface AnthropicSearchConfig {
  state: StateCode
  sourceName: string
  /** Human-readable description of the state portal + URL to search. */
  portalDescription: string
  /** How many records to ask the model to find. */
  perRun?: number
}

interface AnthropicContentBlock {
  type: string
  text?: string
}

interface RawRecord {
  sourceId?: unknown
  title?: unknown
  agency?: unknown
  city?: unknown
  dueLabel?: unknown
  due?: unknown
  sourceUrl?: unknown
}

function buildPrompt(cfg: AnthropicSearchConfig, perRun: number): string {
  return `You are helping a real-estate development consultant find open procurement solicitations from ${cfg.portalDescription}.

Use web search to find CURRENTLY OPEN solicitations posted on that portal. Focus on solicitations relevant to any of these themes:
  - Real estate & development (ground leases, land assemblage, mixed-use, housing, adaptive reuse)
  - Land use & planning (zoning, comprehensive plans, smart growth, brownfields, site reuse, revitalization)
  - Economic development (EDC work, business consulting for development)
  - RE-adjacent tech / data (asset management systems, GIS, location intelligence, transportation planning platforms)
  - Real property appraisal / valuation
  - Land-based energy plays (energy storage siting, land leases for solar, just transition)
  - Advisory / consultant pools ONLY when paired with one of the themes above (a pure "management consulting" pool does NOT qualify)

Return up to ${perRun} matching solicitations that are OPEN as of today. Verify each one exists on the portal via web search — do not fabricate.

Return ONLY a JSON array (no prose, no code fences). Each element:
{
  "sourceId": "portal solicitation number (unique on the portal)",
  "title": "solicitation title",
  "agency": "issuing agency / organization",
  "city": "city or 'Statewide' if unspecified",
  "dueLabel": "human date label like 'M/D/YYYY' or 'Rolling'",
  "due": "ISO YYYY-MM-DD if a fixed date, else empty string",
  "sourceUrl": "direct URL to the specific solicitation record on the portal — MUST link to the individual bid, not a search page"
}

If you can't find a direct URL for a record, do NOT include it. Better to return fewer records with real deep-links than more records with search-page URLs.
If no matches, return [].`
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

export async function ingestViaAnthropicSearch(
  cfg: AnthropicSearchConfig,
): Promise<AdapterResult> {
  const key = process.env.ANTHROPIC_API_KEY
  const stats = emptyStats()
  const records: Opportunity[] = []
  const now = new Date().toISOString()
  const perRun = cfg.perRun ?? 40

  if (!key) {
    return {
      ok: false,
      records,
      stats,
      error: 'ANTHROPIC_API_KEY not set',
      fetched: 0,
    }
  }

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
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
        messages: [{ role: 'user', content: buildPrompt(cfg, perRun) }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return {
        ok: false,
        records,
        stats,
        error: `Anthropic HTTP ${res.status}: ${err.slice(0, 300)}`,
        fetched: 0,
      }
    }
    const data = (await res.json()) as { content?: AnthropicContentBlock[] }
    raw = (data.content || [])
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text as string)
      .join('\n')
  } catch (e) {
    return {
      ok: false,
      records,
      stats,
      error: e instanceof Error ? e.message : String(e),
      fetched: 0,
    }
  }

  const arr = extractJsonArray(raw) as RawRecord[]
  let fetched = 0

  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    fetched++

    const sourceId = safeStr(item.sourceId)
    const title = safeStr(item.title)
    const agency = safeStr(item.agency)
    const sourceUrl = safeStr(item.sourceUrl)

    if (!sourceId || !title || !sourceUrl) continue
    // Sanity-check URL — reject if it doesn't look like a real URL
    if (!/^https?:\/\/\S+/.test(sourceUrl)) continue

    const result = matchesFilter(title, '', agency)
    accumulate(stats, result)
    if (!result.pass) continue

    const rec: Opportunity = {
      id: `${cfg.state}:${sourceId}`,
      state: cfg.state,
      sourceId,
      sourceName: cfg.sourceName,
      sourceUrl,
      linkStatus: 'direct',
      title,
      agency,
      city: safeStr(item.city),
      due: safeStr(item.due),
      dueLabel: safeStr(item.dueLabel),
      cr: sourceId,
      tier: '',
      rationale: '',
      notes: '',
      curated: false,
      ingestedAt: now,
    }
    records.push(rec)
  }

  return { ok: true, records, stats, fetched }
}
