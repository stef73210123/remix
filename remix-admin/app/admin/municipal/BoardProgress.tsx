'use client'

import ProgressSpectrum from './ProgressSpectrum'
import TranscriptCaveat from './TranscriptCaveat'
import { sentimentLabel } from './sentiment'

export interface BoardScore {
  key: string
  displayName: string
  score: number | null
  positions: number
  members: number
}

/** Below this many attributed remarks, a board's average is noise — one or two
 *  comments can swing it to either extreme. We show the row (hiding a board
 *  entirely would be its own distortion) but withhold the number and say why. */
const MIN_REMARKS = 15

/**
 * Consolidated roll-up of how each covered board's recorded discussion reads —
 * one spectrum row each — so the picture across the town's boards is legible at
 * a glance on the dashboard. Boards we have no recordings for are hidden here
 * (and from the board tab strip); the "X of Y boards covered" count keeps the
 * full slate honest. Scores arrive via props (MunicipalClient owns the fetch so
 * the tab strip can share them).
 */
export default function BoardSentiment({ muniKey, boards, loading }: { muniKey: string; boards: BoardScore[] | null; loading: boolean }) {
  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading discussion tone…</div>
  if (!boards || boards.length === 0) return null

  const analyzed = boards.filter((b) => b.score != null)
  if (analyzed.length === 0) return null

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>
        Discussion tone by board
        <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {analyzed.length} of {boards.length} boards covered</span>
      </h2>
      <div className="muted" style={{ fontSize: 11, marginBottom: 10, lineHeight: 1.5, maxWidth: 720 }}>
        Across the meetings we have recordings for, how each board&apos;s comments read overall —
        from mostly critical (−10) to mostly supportive (+10). Boards we don&apos;t yet have
        recordings for aren&apos;t shown.
      </div>
      <TranscriptCaveat />
      <div className="card" style={{ padding: 0 }}>
        {analyzed.map((b, i) => (
          <div
            key={b.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
              borderTop: i ? '1px solid var(--border)' : 'none', flexWrap: 'wrap',
            }}
          >
            <div style={{ width: 180, flexShrink: 0, minWidth: 140 }}>
              <a
                href={`/admin/municipal/board?muni=${muniKey}&body=${b.key}`}
                style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', textDecoration: 'none' }}
              >
                {b.displayName}
              </a>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                {b.positions >= MIN_REMARKS ? `${sentimentLabel(b.score!)} · ` : ''}
                {b.positions} attributed remark{b.positions === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              {b.positions >= MIN_REMARKS ? (
                <ProgressSpectrum score={b.score!} height={14} />
              ) : (
                <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                  Too few remarks matched to a member so far to say anything meaningful about this board&apos;s
                  discussion. Open the board page for the meetings we do have.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
