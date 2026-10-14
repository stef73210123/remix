/**
 * Site-wide search over everything the town publishes here: applications and
 * agenda items, the officials who decide them, the addresses they sit at, the
 * boards themselves, and the departments behind them.
 *
 * Built entirely from the committed analysis datasets, dossiers and registry —
 * no database. That is deliberate: the DB holds meetings and permits and is
 * sometimes unreachable, and a search box that goes dark with it would be worse
 * than one that covers slightly less. Everything indexed here ships with the
 * deploy, so the index is as available as the site is.
 */
import { loadAnalysis, loadBoardDossiers, analysisBodiesForMuni } from './analysis'
import { findMunicipality, isHiddenBody } from './registry'
import { getBoardDepartments } from './departments'
import { parseAddress } from './address'

export type ResultKind = 'case' | 'person' | 'address' | 'board' | 'department'

export interface SearchResult {
  kind: ResultKind
  /** What to show in bold. */
  title: string
  /** The dimmer second line: role, board, status, appearance count. */
  subtitle: string
  href: string
  /** Higher sorts first. */
  score: number
}

interface Entry {
  kind: ResultKind
  title: string
  subtitle: string
  href: string
  /** Lower-cased strings matched against; the first is the primary name. */
  haystack: string[]
  /** Nudges intrinsically more useful rows up when scores otherwise tie. */
  weight: number
  /** Addresses only: how many applications share it. */
  hits?: number
}

/** Fold case, punctuation and accents so "O'Brien", "obrien" and "OBrien" meet. */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Score one entry against the already-normalised query terms.
 * Returns 0 for "no match" — every term must appear somewhere, so typing more
 * words narrows rather than widens, which is what people expect of a search box.
 */
function scoreEntry(e: Entry, terms: string[], rawQuery: string): number {
  const fields = e.haystack.map(norm)
  const primary = fields[0] || ''
  let total = 0

  for (const t of terms) {
    let best = 0
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      const at = f.indexOf(t)
      if (at < 0) continue
      // Prefix of the whole field beats a word start beats a mid-word hit, and
      // the primary field counts for more than the trailing ones.
      const atWordStart = at === 0 || f[at - 1] === ' '
      let s = at === 0 ? 10 : atWordStart ? 7 : 3
      s = s / (1 + i * 0.5)
      if (s > best) best = s
    }
    if (best === 0) return 0
    total += best
  }

  // A clean prefix match on the whole query is almost always the one wanted.
  const q = norm(rawQuery)
  if (primary.startsWith(q)) total += 12
  else if (primary.includes(q)) total += 4
  // Shorter titles are usually the more specific record.
  total += Math.max(0, 6 - primary.length / 12)
  return total + e.weight
}

const indexCache = new Map<string, Entry[]>()

function buildIndex(muniKey: string): Entry[] {
  const cached = indexCache.get(muniKey)
  if (cached) return cached

  const cfg = findMunicipality(muniKey)
  const out: Entry[] = []
  if (!cfg) return out

  // De-duplicate people and addresses, which recur across boards.
  const people = new Map<string, Entry>()
  const addresses = new Map<string, Entry>()
  // An address that merely restates a case title ("9 Barnard Road") would show
  // the same place twice; only addresses that differ from the application name
  // earn their own row.
  const caseTitles = new Set<string>()

  for (const body of cfg.bodies) {
    if (isHiddenBody(muniKey, body.key)) continue

    out.push({
      kind: 'board',
      title: body.displayName,
      subtitle: body.meetingPattern || 'Town board',
      href: `/admin/municipal/board?muni=${muniKey}&body=${body.key}`,
      haystack: [body.displayName, body.key.replace(/_/g, ' ')],
      weight: 6,
    })

    for (const d of getBoardDepartments(muniKey, body.key)) {
      const key = `dept:${d.department}`
      if (out.some((e) => e.kind === 'department' && e.title === (d.person || d.department))) continue
      out.push({
        kind: 'department',
        title: d.person || d.department,
        subtitle: d.person ? `${d.title} · ${body.displayName}` : body.displayName,
        href: `/admin/municipal/board?muni=${muniKey}&body=${body.key}`,
        haystack: [d.person || d.department, d.department, d.title, key],
        weight: 2,
      })
    }
  }

  for (const bodyKey of analysisBodiesForMuni(muniKey)) {
    if (isHiddenBody(muniKey, bodyKey)) continue
    const data = loadAnalysis(muniKey, bodyKey)
    if (!data) continue
    const boardName = data.meta.board || bodyKey
    const dossiers = loadBoardDossiers(muniKey, bodyKey) || {}
    const inactive = new Set((data.meta.inactiveMembers || []).map((n) => n.toLowerCase()))

    for (const name of data.meta.roster || []) {
      const k = name.toLowerCase()
      if (people.has(k)) {
        // Already seen on another board — widen the subtitle rather than duplicate.
        const prev = people.get(k)!
        if (!prev.subtitle.includes(boardName)) prev.subtitle += ` · ${boardName}`
        continue
      }
      const role = data.meta.roles?.[name] || dossiers[name]?.role || 'Member'
      people.set(k, {
        kind: 'person',
        title: name,
        subtitle: `${role} · ${boardName}${inactive.has(k) ? ' · former' : ''}`,
        href: `/admin/municipal/member?muni=${muniKey}&body=${bodyKey}&byName=${encodeURIComponent(name)}`,
        haystack: [name, role, boardName],
        weight: inactive.has(k) ? 2 : 8,
      })
    }

    for (const c of data.cases || []) {
      out.push({
        kind: 'case',
        title: c.name,
        subtitle: [c.lastStatus, `${c.appearances} meeting${c.appearances === 1 ? '' : 's'}`, boardName]
          .filter(Boolean)
          .join(' · '),
        // Lands on the board page with the profile already open — the same
        // deep link the case modal writes when you open one by hand.
        href: `/admin/municipal/board?muni=${muniKey}&body=${bodyKey}&case=${encodeURIComponent(c.id)}`,
        haystack: [c.name, c.address, c.applicant, c.applicationType, c.id.replace(/-/g, ' ')],
        weight: 5,
      })
      caseTitles.add(norm(c.name))

      // Addresses get their own row so "9 Barnard" finds the place even when the
      // application is named for something else entirely.
      const parsed = parseAddress(c.address)
      if (!parsed) continue
      // Key on the PARSED form, not the raw string: "12 Maple Avenue",
      // "12 Maple Avenue, Armonk" and "12 Maple Avenue, Armonk, NY" are one
      // place and must not become three rows.
      const k = `${parsed.number ?? ''}|${parsed.key}`
      if (!parsed.key || caseTitles.has(norm(c.address))) continue
      const seen = addresses.get(k)
      if (seen) {
        // Keep the tidiest spelling of the address as the label.
        if (c.address.length < seen.title.length) seen.title = c.address
        // Recurring addresses are the notable ones, and the subtitle should say so.
        seen.weight += 0.5
        seen.hits = (seen.hits ?? 1) + 1
        seen.subtitle = `Address · ${seen.hits} applications`
        continue
      }
      addresses.set(k, {
        kind: 'address',
        title: c.address,
        subtitle: `Address · ${boardName}`,
        // Pre-fills the board's own search rather than opening one arbitrary
        // application, so every filing at the address is on screen at once.
        href: `/admin/municipal/board?muni=${muniKey}&body=${bodyKey}&q=${encodeURIComponent(c.address)}`,
        haystack: [c.address, parsed.name, c.name],
        weight: 3,
        hits: 1,
      })
    }
  }

  const all = [...out, ...people.values(), ...addresses.values()]
  indexCache.set(muniKey, all)
  return all
}

export function searchSite(muniKey: string, query: string, limit = 24): SearchResult[] {
  const q = query.trim()
  if (q.length < 2) return []
  const terms = norm(q).split(' ').filter(Boolean)
  if (terms.length === 0) return []

  const scored: SearchResult[] = []
  for (const e of buildIndex(muniKey)) {
    const score = scoreEntry(e, terms, q)
    if (score > 0) scored.push({ kind: e.kind, title: e.title, subtitle: e.subtitle, href: e.href, score })
  }
  scored.sort((a, b) => b.score - a.score || a.title.length - b.title.length)
  return scored.slice(0, limit)
}

/** Total indexed rows — used by the API to report coverage honestly. */
export function indexSize(muniKey: string): number {
  return buildIndex(muniKey).length
}
