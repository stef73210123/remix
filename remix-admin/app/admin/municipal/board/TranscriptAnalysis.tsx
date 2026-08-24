'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AnalysisDataset, MonthlyIssueVolume, ThemeRollup } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent, sentimentLabel } from '../sentiment'
import MeetingTimelineChart from './MeetingTimelineChart'
import ProgressSpectrum, { weightedProgressScore } from '../ProgressSpectrum'
import Sparkline from '../Sparkline'
import TranscriptCaveat from '../TranscriptCaveat'
import { fmtDateShort } from '@/lib/municipal/date'

/** Trailing months of history shown in each theme row's sparkline. */
const SPARKLINE_MONTHS = 12

/** Buckets a theme's per-appearance timeline into trailing monthly volume +
 *  avg sentiment — same shape/aggregation as aggregateTownIssues'
 *  monthlyByTheme, just scoped to this one board's dataset. */
function monthlyFromTimeline(timeline: ThemeRollup['timeline']): MonthlyIssueVolume[] {
  const byMonth = new Map<string, { sum: number; n: number }>()
  for (const p of timeline) {
    const month = p.date.slice(0, 7)
    const cur = byMonth.get(month) || { sum: 0, n: 0 }
    cur.sum += p.sentiment
    cur.n += 1
    byMonth.set(month, cur)
  }
  return [...byMonth.entries()]
    .map(([month, v]) => ({ month, volume: v.n, avgSentiment: v.sum / v.n }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function fmtCaptionDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return fmtDateShort(d)
}

type ThemeSort = 'volume' | 'positive' | 'negative'

export default function TranscriptAnalysis({ muni, body, onData }: {
  muni: string
  body: string
  /** Lets the host page reuse the dataset (e.g. the Meetings section renders the
   *  meeting-by-meeting rows attached to its timeline). */
  onData?: (d: AnalysisDataset | null) => void
}) {
  const [data, setData] = useState<AnalysisDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [themeSort, setThemeSort] = useState<ThemeSort>('volume')

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/transcript-analysis?muni=${encodeURIComponent(muni)}&body=${encodeURIComponent(body)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => {
        const ds = d && d.available !== false ? (d as AnalysisDataset) : null
        setData(ds)
        onData?.(ds)
      })
      .catch(() => { setData(null); onData?.(null) })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muni, body])

  // Most recent meeting the analysis covers — shown as a "current as of" caption
  // so readers know how fresh the ingested/analyzed data is.
  const latestMeetingDate = useMemo(() => {
    const dates = (data?.meetings ?? []).map((mt) => mt.date).filter(Boolean).sort()
    return dates.length ? dates[dates.length - 1] : null
  }, [data])

  // Themes, re-ranked by the selected lens.
  const themesSorted = useMemo(() => {
    const t = [...(data?.themes ?? [])]
    if (themeSort === 'positive') return t.sort((a, b) => b.avgSentiment - a.avgSentiment)
    if (themeSort === 'negative') return t.sort((a, b) => a.avgSentiment - b.avgSentiment)
    return t.sort((a, b) => b.meetings - a.meetings)
  }, [data, themeSort])

  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading transcript analysis…</div>
  if (!data) return null

  const m = data.meta
  // Board-appropriate noun for the "cases" (Planning = applications; Town Board = agenda items).
  const isTownBoard = m.bodyKey === 'town_board'
  const itemNounPlural = isTownBoard ? 'agenda items' : 'applications'

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>What this board discussed</h2>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
        Read from the recordings of {m.meetings} meetings: {m.cases} {itemNounPlural}, {m.themes} recurring topics, and {m.memberPositions} remarks matched to a member.
      </div>
      {latestMeetingDate && (
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          Covers meetings through {fmtCaptionDate(latestMeetingDate)}. Anything more recent isn&apos;t here yet.
        </div>
      )}
      <TranscriptCaveat />
      {/* ---- Consolidated board progress score ---- */}
      {(() => {
        const board = weightedProgressScore(data.members)
        if (!board) return null
        return (
          <div className="card" style={{ padding: 16, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{m.board} — overall discussion tone</span>
              <span style={sentimentChipStyle(board.score)}>{fmtSent(board.score)}</span>
              <span className="muted" style={{ fontSize: 13 }}>{sentimentLabel(board.score)}</span>
              <span className="muted" style={{ fontSize: 12 }}>· {board.positions} remarks across {board.members} members</span>
            </div>
            <ProgressSpectrum score={board.score} height={16} showScale />
          </div>
        )
      })()}

      {/* ---- Sentiment timeline (stacked columns per meeting) ---- */}
      <MeetingTimelineChart data={data} />

      {/* ---- Themes ---- */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h3 style={{ fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          What comes up most often
        </h3>
        <div className="pill-strip" style={{ display: 'flex', gap: 4 }}>
          {([['volume', 'Most discussed'], ['positive', 'Most supportive'], ['negative', 'Most critical']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setThemeSort(k)}
              className="btn secondary"
              style={{ padding: '4px 10px', fontSize: 12, ...(themeSort === k ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {themesSorted.map((t) => (
            <ThemeRow
              key={t.theme}
              t={t}
              maxMeetings={Math.max(1, ...themesSorted.map((x) => x.meetings))}
              spark={monthlyFromTimeline(t.timeline).slice(-SPARKLINE_MONTHS)}
            />
          ))}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Bar length shows how many meetings raised the topic; color shows how the discussion read —
            <span style={{ width: 10, height: 10, borderRadius: 2, background: sentimentColor(-0.6), display: 'inline-block', marginLeft: 6 }} /> more critical
            <span style={{ width: 10, height: 10, borderRadius: 2, background: sentimentColor(0.6), display: 'inline-block', marginLeft: 8 }} /> more supportive
          </span>
        </div>
      </div>

    </div>
  )
}

function ThemeRow({ t, maxMeetings, spark }: { t: ThemeRollup; maxMeetings: number; spark: MonthlyIssueVolume[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ flex: '2 1 100px', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.theme}>
        {t.theme}
      </span>
      <div style={{ flex: '3 1 50px', background: 'var(--panel-2)', borderRadius: 5, height: 12, overflow: 'hidden' }}>
        <div style={{ width: `${(t.meetings / maxMeetings) * 100}%`, height: '100%', background: sentimentColor(t.avgSentiment), borderRadius: 5, minWidth: 4 }} />
      </div>
      <span className="muted" style={{ width: 44, fontSize: 12, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }} title={`${t.meetings} meetings`}>{t.meetings} mtg</span>
      <span style={{ ...sentimentChipStyle(t.avgSentiment), width: 36, flexShrink: 0, textAlign: 'center', padding: '2px 0' }} title={`avg sentiment ${fmtSent(t.avgSentiment)}`}>{fmtSent(t.avgSentiment)}</span>
      <Sparkline points={spark} />
    </div>
  )
}
