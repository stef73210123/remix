/**
 * Cloud Job Scan — finds NEW firms matching Stefan's target profiles using the
 * Anthropic API with the server-side web_search tool, dedupes against firms
 * already in the sheet, and returns rows ready to append (status "Backlog").
 *
 * This replaces the laptop-side Job Scan for *sourcing new firms*. It runs from
 * a Vercel Cron route (app/api/cron/job-scan) so it needs no laptop.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY   - Anthropic API key
 *   ANTHROPIC_MODEL     - optional, defaults to claude-sonnet-4-6
 */
import { CRM_CATEGORIES, type CrmCategory } from './crm'
import { getJobCrmFromSheet } from './jobcrm'
import type { JobCrmRow } from './sheet-write'

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

const CATEGORY_GUIDE = `Categories (use the exact code):
- CRE: NYC-metro / Northeast commercial real estate owners, developers, investment managers (Stefan's core CRE investment background).
- TECH: PropTech / CRE-tech companies (enterprise, data, analytics roles).
- REC: Real estate + PropTech executive recruiting / search firms.
- AI: AI data-labeling / model-training / RLHF companies hiring domain experts.
- CONSULT: Regional (Westchester / Hudson Valley / CT / Catskills) developers, owners, brokerages, and EDCs that could use real-estate development/advisory consulting.`

function buildPrompt(existingFirms: string[], perRun: number): string {
  const exclude = existingFirms.slice(0, 1200).join(', ')
  return `You are sourcing NEW firms for a real-estate professional's outreach CRM.

${CATEGORY_GUIDE}

Find up to ${perRun} REAL, currently-operating firms that are a strong fit and that are NOT already in this exclusion list. Use web search to confirm each firm exists and to find a plausible general contact email (info@/careers@/hr@) and website. Do not invent emails — if you can't find one, leave it blank.

EXCLUDE these firms already in the CRM (do not return any of these or obvious duplicates/renamings):
${exclude}

Return ONLY a JSON array (no prose, no code fences). Each element:
{"category":"CRE|TECH|REC|AI|CONSULT","firm":"Name","tier":"A|B|C","email":"","city":"","contact":"","web":"domain.com"}
Aim for a mix across categories, weighted toward CRE and CONSULT. If you find nothing new, return [].`
}

interface AnthropicContentBlock {
  type: string
  text?: string
}

function extractJsonArray(text: string): unknown[] {
  let t = text.trim()
  // strip code fences if the model added them despite instructions
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

export interface ScanResult {
  ok: boolean
  candidates: JobCrmRow[]
  error?: string
  raw?: string
}

const VALID = new Set<string>(CRM_CATEGORIES as readonly string[])

export async function runJobScan(perRun = 15): Promise<ScanResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { ok: false, candidates: [], error: 'ANTHROPIC_API_KEY not set' }
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL

  // Build the exclusion set from what's already in the sheet.
  const existing = await getJobCrmFromSheet()
  const existingFirms: string[] = []
  const seen = new Set<string>()
  if (existing) {
    for (const c of CRM_CATEGORIES) {
      for (const e of existing[c]) {
        existingFirms.push(e.firm)
        seen.add(e.firm.toLowerCase().trim())
      }
    }
  }

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
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: buildPrompt(existingFirms, perRun) }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, candidates: [], error: `Anthropic HTTP ${res.status}: ${err.slice(0, 300)}` }
    }
    const data = (await res.json()) as { content?: AnthropicContentBlock[] }
    raw = (data.content || [])
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text as string)
      .join('\n')
  } catch (e) {
    return { ok: false, candidates: [], error: e instanceof Error ? e.message : String(e) }
  }

  const arr = extractJsonArray(raw)
  const candidates: JobCrmRow[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const category = String(o.category || '').toUpperCase()
    const firm = String(o.firm || '').trim()
    if (!firm || !VALID.has(category)) continue
    const kf = firm.toLowerCase().trim()
    if (seen.has(kf)) continue
    seen.add(kf)
    candidates.push({
      category: category as CrmCategory,
      firm,
      tier: String(o.tier || '').trim(),
      status: 'Backlog',
      email: String(o.email || '').trim(),
      city: String(o.city || '').trim(),
      contact: String(o.contact || '').trim(),
      web: String(o.web || '').trim(),
    })
  }

  return { ok: true, candidates, raw }
}
