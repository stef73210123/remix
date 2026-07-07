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

const DATA_ROOT = path.join(process.cwd(), 'lib', 'municipal', 'data', 'nc-planning')

/** Which (muni, body) pairs have a transcript-analysis dataset. */
export function hasAnalysis(muniKey: string, bodyKey: string): boolean {
  return muniKey === 'nc' && bodyKey === 'planning'
}

let cache: AnalysisDataset | null | undefined
export function loadAnalysis(muniKey: string, bodyKey: string): AnalysisDataset | null {
  if (!hasAnalysis(muniKey, bodyKey)) return null
  if (cache !== undefined) return cache
  try {
    const raw = fs.readFileSync(path.join(DATA_ROOT, 'analysis.json'), 'utf8')
    cache = JSON.parse(raw) as AnalysisDataset
  } catch {
    cache = null
  }
  return cache
}

/** List transcript dates available for a board. */
export function listTranscriptDates(muniKey: string, bodyKey: string): string[] {
  if (!hasAnalysis(muniKey, bodyKey)) return []
  try {
    return fs
      .readdirSync(path.join(DATA_ROOT, 'transcripts'))
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.txt$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
  } catch {
    return []
  }
}

/** Raw transcript text for one meeting date, or null. Date must be YYYY-MM-DD. */
export function loadTranscript(muniKey: string, bodyKey: string, date: string): string | null {
  if (!hasAnalysis(muniKey, bodyKey)) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null // guard path traversal
  try {
    return fs.readFileSync(path.join(DATA_ROOT, 'transcripts', `${date}.txt`), 'utf8')
  } catch {
    return null
  }
}
