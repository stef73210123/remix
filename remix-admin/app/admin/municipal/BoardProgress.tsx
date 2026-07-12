'use client'

import ProgressSpectrum from './ProgressSpectrum'
import { sentimentLabel } from './sentiment'

export interface BoardScore {
  key: string
  displayName: string
  score: number | null
  positions: number
  members: number
}

/**
 * Consolidated roll-up of each analyzed board/committee's sentiment score — one
 * spectrum row each — so the governing body's disposition reads at a glance on
 * the dashboard. Boards without a transcript-analysis dataset are hidden here
 * (and from the board tab strip); the "X of Y analyzed" count keeps the full
 * slate honest. Scores arrive via props (MunicipalClient owns the fetch so the
 * tab strip can share them).
 */
export default function BoardSentiment({ muniKey, boards, loading }: { muniKey: string; boards: BoardScore[] | null; loading: boolean }) {
  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading board sentiment…</div>
  if (!boards || boards.length === 0) return null

  const analyzed = boards.filter((b) => b.score != null)
  if (analyzed.length === 0) return null

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>
        Board sentiment
        <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {analyzed.length} of {boards.length} boards analyzed</span>
      </h2>
      <div className="muted" style={{ fontSize: 11, marginBottom: 12, lineHeight: 1.5, maxWidth: 720 }}>
        Each analyzed board&apos;s sentiment score — the position-weighted average of its members&apos; sentiment across analyzed meetings — on a −10 (opposed) to +10 (favorable) spectrum. Boards not yet analyzed are omitted.
      </div>
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
                {sentimentLabel(b.score!)} · {b.positions} positions
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <ProgressSpectrum score={b.score!} height={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
