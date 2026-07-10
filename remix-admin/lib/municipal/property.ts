/**
 * Property-centric federation across every board/committee that has a
 * transcript-analysis dataset for a town.
 *
 * A "property" is an application/matter tied to a street address. The same
 * address can appear before multiple bodies (e.g. a subdivision heard by the
 * Planning Board and a related variance at the Zoning Board of Appeals), so we
 * key by a normalized street address and merge every board's case rollups into
 * one federated timeline. As new boards get datasets (see DATA_DIRS in
 * analysis.ts), their cases federate in automatically — no code change here.
 */
import { analysisBodiesForMuni, loadAnalysis } from './analysis'
import type { CaseRollup } from './analysis'
import { addressKey } from './propertyId'

export interface PropertyParty {
  name: string
  /** applicant | firm | other — a light categorization parsed from the data. */
  role: string
}
export interface PropertyEvent {
  date: string
  board: string
  bodyKey: string
  status: string
  sentiment: number
  summary: string
  caseName: string
  caseId: string
}
export interface PropertyBoardRef {
  board: string
  bodyKey: string
  caseId: string
  appearances: number
}
export interface Property {
  id: string
  /** Representative full address (longest seen). */
  address: string
  /** Cleaned street label, e.g. "40 High Street". */
  label: string
  boards: PropertyBoardRef[]
  parties: PropertyParty[]
  applicationTypes: string[]
  themes: string[]
  appearances: number
  firstSeen: string
  lastSeen: string
  lastStatus: string
  avgSentiment: number
  timeline: PropertyEvent[]
}
export interface PropertySummary {
  id: string
  address: string
  label: string
  boards: string[]
  appearances: number
  firstSeen: string
  lastSeen: string
  lastStatus: string
  avgSentiment: number
  applicationType: string
}

function slugify(k: string): string {
  return k.replace(/\s+/g, '-').slice(0, 80) || 'property'
}
function titleCase(k: string): string {
  return k.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Parse the free-text applicant string into parties. The datasets frequently
 *  embed a firm/attorney in parentheses ("Corey Salman (Zarin & Steinmetz)")
 *  and multiple parties with a slash ("John Luciano / National Fire Sprinklers"). */
function parseParties(applicant: string): PropertyParty[] {
  const out: PropertyParty[] = []
  const seen = new Set<string>()
  const push = (name: string, role: string) => {
    const n = name.trim().replace(/^[-–]\s*/, '')
    if (!n || n.length < 2) return
    const key = n.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push({ name: n, role })
  }
  const firmRole = (s: string) => {
    const t = s.toLowerCase()
    if (/(llc|inc\b|corp|company|co\.|ltd)/.test(t)) return 'company'
    if (/(engineer|survey)/.test(t)) return 'engineer'
    if (/(architect)/.test(t)) return 'architect'
    if (/(&|law|esq|zarin|steinmetz|attorney|pllc|llp)/.test(t)) return 'attorney / firm'
    return 'representative'
  }
  for (const chunk of (applicant || '').split(/\s*\/\s*/)) {
    const paren = chunk.match(/\(([^)]+)\)/)
    const base = chunk.replace(/\([^)]*\)/g, '').trim()
    if (paren) push(paren[1], firmRole(paren[1]))
    push(base, 'applicant')
  }
  return out
}

interface Bucket {
  address: string
  boards: Map<string, PropertyBoardRef>
  parties: PropertyParty[]
  types: Set<string>
  themes: Set<string>
  events: PropertyEvent[]
  sentiments: number[]
}

function buildIndex(muniKey: string): Map<string, Bucket> {
  const idx = new Map<string, Bucket>()
  for (const bodyKey of analysisBodiesForMuni(muniKey)) {
    const data = loadAnalysis(muniKey, bodyKey)
    if (!data) continue
    const board = data.meta.board
    for (const c of data.cases as CaseRollup[]) {
      const raw = c.address || ''
      if (!raw.trim()) continue // property pages require an address
      const key = addressKey(raw)
      if (!key || key.length < 3) continue
      let b = idx.get(key)
      if (!b) {
        b = { address: raw, boards: new Map(), parties: [], types: new Set(), themes: new Set(), events: [], sentiments: [] }
        idx.set(key, b)
      }
      if (raw.length > b.address.length) b.address = raw
      const ref = b.boards.get(bodyKey) || { board, bodyKey, caseId: c.id, appearances: 0 }
      ref.appearances += c.appearances
      b.boards.set(bodyKey, ref)
      for (const t of c.themes || []) b.themes.add(t)
      if (c.applicationType) b.types.add(c.applicationType)
      for (const p of parseParties(c.applicant || '')) {
        if (!b.parties.some((x) => x.name.toLowerCase() === p.name.toLowerCase())) b.parties.push(p)
      }
      for (const ap of c.timeline || []) {
        b.events.push({
          date: ap.date, board, bodyKey, status: ap.status || '',
          sentiment: ap.sentiment, summary: ap.summary || '', caseName: c.name, caseId: c.id,
        })
        b.sentiments.push(ap.sentiment)
      }
    }
  }
  return idx
}

function mean(xs: number[]): number {
  return xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 1000) / 1000 : 0
}

/** All properties for a town, most-recently-active first. */
export function listProperties(muniKey: string): PropertySummary[] {
  const idx = buildIndex(muniKey)
  const out: PropertySummary[] = []
  for (const [key, b] of idx) {
    const dates = b.events.map((e) => e.date).sort()
    out.push({
      id: slugify(key),
      address: b.address,
      label: titleCase(key),
      boards: [...b.boards.values()].map((r) => r.board),
      appearances: b.events.length,
      firstSeen: dates[0] || '',
      lastSeen: dates[dates.length - 1] || '',
      lastStatus: b.events.length ? [...b.events].sort((a, c) => a.date.localeCompare(c.date))[b.events.length - 1].status : '',
      avgSentiment: mean(b.sentiments),
      applicationType: [...b.types][0] || '',
    })
  }
  out.sort((a, c) => c.lastSeen.localeCompare(a.lastSeen) || c.appearances - a.appearances)
  return out
}

/** Full federated detail for one property by id (slug of the address key). */
export function getProperty(muniKey: string, id: string): Property | null {
  const idx = buildIndex(muniKey)
  for (const [key, b] of idx) {
    if (slugify(key) !== id) continue
    const events = [...b.events].sort((a, c) => a.date.localeCompare(c.date) || a.board.localeCompare(c.board))
    const dates = events.map((e) => e.date)
    return {
      id,
      address: b.address,
      label: titleCase(key),
      boards: [...b.boards.values()].sort((x, y) => y.appearances - x.appearances),
      parties: b.parties,
      applicationTypes: [...b.types],
      themes: [...b.themes].sort(),
      appearances: events.length,
      firstSeen: dates[0] || '',
      lastSeen: dates[dates.length - 1] || '',
      lastStatus: events.length ? events[events.length - 1].status : '',
      avgSentiment: mean(b.sentiments),
      timeline: events,
    }
  }
  return null
}
