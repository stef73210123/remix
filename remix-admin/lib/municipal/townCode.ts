/**
 * Town Code dataset — an AI-generated, chapter-by-chapter review of a town's
 * full municipal code (sourced from the town's General Code / eCode360
 * publication). Each chapter gets a rating, a 0-100 progress score, and
 * recommendations tagged with whichever optimization lens actually fits that
 * chapter's substance (not a fixed lens list per chapter).
 *
 * This is directional AI commentary, not legal advice, and peer-town
 * comparisons reflect general professional knowledge of common practice
 * rather than a document-to-document review of other towns' actual code.
 */
import fs from 'fs'
import path from 'path'

export type ChapterRating = 'Good shape' | 'Standard' | 'Needs work'

export interface ChapterRecommendation {
  lens: string
  suggestion: string
}

/** One attributed, on-the-record statement (from an actual meeting transcript)
 *  criticizing this chapter as deficient, silent, obsolete, ambiguous,
 *  unenforceable, or internally inconsistent — plus, where the codified text
 *  itself was checked, a note on whether it confirms/contradicts the claim. */
export interface ChapterRecordFinding {
  /** Section cited, e.g. "§355-40" — omitted when the finding is chapter-wide. */
  section?: string
  flawType: string
  quote: string
  attribution: string
  /** "Board, Month Day, Year[, hh:mm:ss]" */
  meeting: string
  corroboration?: string
}

/** Evidence pulled from the Town's own meeting transcripts on how this
 *  chapter actually performs in practice — a companion to the AI review
 *  above, sourced from board/staff/counsel/applicant statements on the
 *  record rather than from reading the code text alone. */
export interface ChapterRecordEvidence {
  verdict: string
  criticismEpisodes: number
  citingUtterances: number
  meetingsCiting: number
  findings: ChapterRecordFinding[]
  amendmentTraffic?: string
  /** Explanatory note for chapters with zero retained criticism findings —
   *  distinguishes genuine adequacy (heavy routine citation, never disputed)
   *  from simple absence of testing (rarely triggered, so never debated). */
  note?: string
}

export interface CodeChapter {
  chapter: string
  title: string
  category: string
  summary: string
  lastAmendment: string | null
  rating: ChapterRating
  progressScore: number
  ratingRationale: string
  strengths?: string[]
  concerns?: string[]
  recommendations: ChapterRecommendation[]
  peerComparison: string
  recordEvidence?: ChapterRecordEvidence
}

export interface TownCodeMeta {
  town: string
  muniKey: string
  source: string
  totalChapters: number
  ratingCounts: Record<string, number>
  categoryCounts: Record<string, number>
  avgProgressScore: number
  methodologyNote: string
  /** Provenance/methodology note for the transcript-record evidence layer
   *  (corpus size, pass methodology) — shown alongside methodologyNote. */
  recordAppendixNote?: string
}

/** Summary stats for the transcript corpus behind the record-evidence layer. */
export interface RecordCorpusStats {
  totalTranscripts: number
  byBoard: Record<string, number>
  dateRange: string
  pass1: string
  pass2: string
  pass3: string
}

export interface TownCodeDataset {
  meta: TownCodeMeta
  chapters: CodeChapter[]
  recordCorpus?: RecordCorpusStats
  /** Findings that span multiple chapters or lie between provisions, so no
   *  single chapter's evidence list can surface them on its own. */
  crossCuttingFindings?: string[]
}

// (muni) → committed data directory. Add a row when a town gets a Town Code dataset.
const DATA_DIRS: Record<string, string> = {
  nc: 'nc-towncode',
}

const cache = new Map<string, TownCodeDataset | null>()

/** Whether a town has a Town Code dataset. */
export function hasTownCode(muniKey: string): boolean {
  return muniKey in DATA_DIRS
}

/** The full Town Code dataset for a town, or null if none exists. */
export function loadTownCode(muniKey: string): TownCodeDataset | null {
  const dir = DATA_DIRS[muniKey]
  if (!dir) return null
  if (cache.has(muniKey)) return cache.get(muniKey) ?? null
  let val: TownCodeDataset | null = null
  try {
    val = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'lib', 'municipal', 'data', dir, 'analysis.json'), 'utf8')
    ) as TownCodeDataset
  } catch {
    val = null
  }
  cache.set(muniKey, val)
  return val
}
