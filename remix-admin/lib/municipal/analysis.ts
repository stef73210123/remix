/**
 * Transcript-analysis dataset for a board (currently North Castle Planning Board).
 *
 * The dataset is a committed JSON file produced offline from 12 months of
 * meeting-video transcripts (ASR, un-diarized). Member-level sentiment is
 * name-based attribution with a per-position confidence, since the transcripts
 * carry no speaker labels — case- and theme-level sentiment is more robust than
 * per-member. Served at runtime by the transcript-analysis API route.
 */
import fs from 'fs'
import path from 'path'

export interface ThemeTimelinePoint { date: string; sentiment: number; salience: number }
export interface ThemeRollup {
  theme: string
  meetings: number
  avgSentiment: number
  avgSalience: number
  timeline: ThemeTimelinePoint[]
}
export interface CaseAppearance { date: string; status: string; sentiment: number; summary: string }
export interface CaseTrajectoryPoint { date: string; sentiment: number; status: string }
export interface CaseRollup {
  id: string
  name: string
  address: string
  applicationType: string
  applicant: string
  themes: string[]
  appearances: number
  firstSeen: string
  lastSeen: string
  lastStatus: string
  avgSentiment: number
  trajectory: CaseTrajectoryPoint[]
  timeline: CaseAppearance[]
}
export interface MemberThemeSentiment { theme: string; count: number; avgSentiment: number }
export interface MemberCaseSentiment { caseId: string; count: number; avgSentiment: number }
export interface MemberEvidence {
  date: string
  case: string
  caseId: string
  stance: string
  score: number
  themes: string[]
  evidence: string
  confidence: string
}
export interface MemberProfile {
  member: string
  totalPositions: number
  avgSentiment: number
  confidenceMix: Record<string, number>
  byTheme: MemberThemeSentiment[]
  byCase: MemberCaseSentiment[]
  evidence: MemberEvidence[]
}
export interface MeetingTimelinePoint {
  date: string
  cases: number
  avgSentiment: number
  attributionCoverage: string
}
export interface MemberPosition {
  member: string
  stance: string
  score: number
  themes: string[]
  evidence: string
  confidence: string
}
export interface MeetingCase {
  id: string
  name: string
  address: string
  applicationType: string
  applicant: string
  status: string
  summary: string
  themes: string[]
  overallSentiment: string
  sentimentScore: number
  publicComment?: string
  memberPositions: MemberPosition[]
}
export interface MeetingAnalysis {
  date: string
  meetingSummary: string
  durationNote?: string
  cases: MeetingCase[]
  themes: { theme: string; salience: number; sentiment: number; note?: string }[]
  staffInput?: { person: string; role: string; summary: string; cases: string[] }[]
  attributionCoverage?: string
  attributionNote?: string
}
export interface AnalysisMeta {
  board: string
  muniKey: string
  bodyKey: string
  town: string
  meetings: number
  cases: number
  themes: number
  memberPositions: number
  roster: string[]
  /** Members on the roster who no longer serve (de-emphasized in the UI). */
  inactiveMembers?: string[]
  /** Optional title per member (e.g. "Supervisor", "Councilwoman"), shown on
   *  the board-overview cards so elected roles read at a glance. */
  roles?: Record<string, string>
  source: string
  errors: string[]
}
export interface AnalysisDataset {
  meta: AnalysisMeta
  meetingTimeline: MeetingTimelinePoint[]
  themes: ThemeRollup[]
  cases: CaseRollup[]
  members: MemberProfile[]
  meetings: MeetingAnalysis[]
}

// (muni, body) → committed data directory. Add a row when a board gets a dataset.
const DATA_DIRS: Record<string, string> = {
  'nc:planning': 'nc-planning',
  'nc:town_board': 'nc-townboard',
}
function dataDir(muniKey: string, bodyKey: string): string | null {
  const d = DATA_DIRS[`${muniKey}:${bodyKey}`]
  return d ? path.join(process.cwd(), 'lib', 'municipal', 'data', d) : null
}

/** Which (muni, body) pairs have a transcript-analysis dataset. */
export function hasAnalysis(muniKey: string, bodyKey: string): boolean {
  return dataDir(muniKey, bodyKey) !== null
}

/** Body keys under a town that have a transcript-analysis dataset. */
export function analysisBodiesForMuni(muniKey: string): string[] {
  return Object.keys(DATA_DIRS)
    .filter((k) => k.startsWith(`${muniKey}:`))
    .map((k) => k.split(':')[1])
}

export interface AggregateThemeStat {
  theme: string
  mentions: number
  avgSentiment: number
  boards: string[]
}
export interface TownIssuesAggregate {
  town: string
  years: number[]
  byYear: Record<string, AggregateThemeStat[]>
}

/** Aggregate theme volume + sentiment across ALL of a town's boards, by calendar
 *  year. Built from each board's theme timelines (date-stamped sentiment). */
export function aggregateTownIssues(muniKey: string): TownIssuesAggregate | null {
  const bodies = analysisBodiesForMuni(muniKey)
  if (bodies.length === 0) return null
  let town = ''
  // year → theme → { sum, n, boards }
  const perYear = new Map<number, Map<string, { sum: number; n: number; boards: Set<string> }>>()
  for (const body of bodies) {
    const data = loadAnalysis(muniKey, body)
    if (!data) continue
    town = town || data.meta.town
    const boardName = data.meta.board
    for (const theme of data.themes) {
      for (const pt of theme.timeline) {
        const year = Number(pt.date.slice(0, 4))
        if (!Number.isFinite(year)) continue
        if (!perYear.has(year)) perYear.set(year, new Map())
        const tm = perYear.get(year)!
        const cur = tm.get(theme.theme) || { sum: 0, n: 0, boards: new Set<string>() }
        cur.sum += pt.sentiment
        cur.n += 1
        cur.boards.add(boardName)
        tm.set(theme.theme, cur)
      }
    }
  }
  if (perYear.size === 0) return null
  const byYear: Record<string, AggregateThemeStat[]> = {}
  for (const [year, tm] of perYear) {
    byYear[String(year)] = [...tm.entries()]
      .map(([theme, v]) => ({ theme, mentions: v.n, avgSentiment: v.sum / v.n, boards: [...v.boards].sort() }))
      .sort((a, b) => b.mentions - a.mentions)
  }
  const years = [...perYear.keys()].sort((a, b) => b - a)
  return { town, years, byYear }
}

const cache = new Map<string, AnalysisDataset | null>()
export function loadAnalysis(muniKey: string, bodyKey: string): AnalysisDataset | null {
  const dir = dataDir(muniKey, bodyKey)
  if (!dir) return null
  const key = `${muniKey}:${bodyKey}`
  if (cache.has(key)) return cache.get(key) ?? null
  let val: AnalysisDataset | null = null
  try {
    val = JSON.parse(fs.readFileSync(path.join(dir, 'analysis.json'), 'utf8')) as AnalysisDataset
  } catch {
    val = null
  }
  cache.set(key, val)
  return val
}

/**
 * A board's consolidated "progress score": the position-weighted mean of its
 * members' average sentiment (−1…+1), or null when the board has no analyzed
 * positions. Used for the per-board spectrum and the dashboard roll-up.
 */
export function boardProgressScore(
  muniKey: string,
  bodyKey: string,
): { score: number; positions: number; members: number } | null {
  const data = loadAnalysis(muniKey, bodyKey)
  if (!data) return null
  const scored = data.members.filter((m) => m.totalPositions > 0)
  const positions = scored.reduce((s, m) => s + m.totalPositions, 0)
  if (!positions) return null
  const score = scored.reduce((s, m) => s + m.avgSentiment * m.totalPositions, 0) / positions
  return { score, positions, members: scored.length }
}

/** List transcript dates available for a board. */
export function listTranscriptDates(muniKey: string, bodyKey: string): string[] {
  const dir = dataDir(muniKey, bodyKey)
  if (!dir) return []
  try {
    return fs
      .readdirSync(path.join(dir, 'transcripts'))
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.txt$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
  } catch {
    return []
  }
}

/** Raw transcript text for one meeting date, or null. Date must be YYYY-MM-DD. */
export function loadTranscript(muniKey: string, bodyKey: string, date: string): string | null {
  const dir = dataDir(muniKey, bodyKey)
  if (!dir) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null // guard path traversal
  try {
    return fs.readFileSync(path.join(dir, 'transcripts', `${date}.txt`), 'utf8')
  } catch {
    return null
  }
}

// ---- Member dossiers (researched stakeholder profiles) ----
export interface MemberTerm {
  /** Year first elected/appointed to this body (career start on the body). */
  firstYear?: number
  /** Current term start year (Jan of the year after the election). */
  start?: number
  /** Current term end year (term expires Dec 31 of this year). */
  end?: number
  /** Term length in years (2 for NC Supervisor, 4 for Council). */
  lengthYears?: number
  /** 'elected' or 'appointed' — appointed boards (Planning/ZBA) differ. */
  type?: 'elected' | 'appointed'
}

export interface MemberDossier {
  member: string
  role?: string
  /** Elected/appointed term details, surfaced on the profile page. */
  term?: MemberTerm
  email?: string
  emailSource?: string
  /** Headshot image URL (committed under /public/municipal/headshots or remote). */
  photo?: string
  bio?: string
  bioConfidence?: 'high' | 'medium' | 'low' | string
  engagement?: {
    keyIssues?: string[]
    likes?: string
    dislikes?: string
    recommendation?: string
  }
  sources?: string[]
  notes?: string
}

const dossierCache = new Map<string, Record<string, MemberDossier> | null>()
function loadDossiers(muniKey: string, bodyKey: string): Record<string, MemberDossier> | null {
  const dir = dataDir(muniKey, bodyKey)
  if (!dir) return null
  const key = `${muniKey}:${bodyKey}`
  if (dossierCache.has(key)) return dossierCache.get(key) ?? null
  let val: Record<string, MemberDossier> | null = null
  try {
    val = (JSON.parse(fs.readFileSync(path.join(dir, 'dossiers.json'), 'utf8')) as { members: Record<string, MemberDossier> }).members
  } catch {
    val = null
  }
  dossierCache.set(key, val)
  return val
}

/** Researched dossier for one member (name-matched, tolerant of minor variants). */
export function loadDossier(muniKey: string, bodyKey: string, name: string): MemberDossier | null {
  const all = loadDossiers(muniKey, bodyKey)
  if (!all) return null
  const n = name.trim().toLowerCase()
  const exact = Object.values(all).find((d) => d.member.toLowerCase() === n)
  if (exact) return exact
  return (
    Object.values(all).find(
      (d) => d.member.toLowerCase().includes(n) || n.includes(d.member.toLowerCase())
    ) || null
  )
}
