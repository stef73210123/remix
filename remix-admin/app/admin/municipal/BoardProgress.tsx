'use client'

import { useEffect, useState } from 'react'
import ProgressSpectrum from './ProgressSpectrum'
import { sentimentLabel } from './sentiment'

interface BoardScore {
  key: string
  displayName: string
  score: number | null
  positions: number
  members: number
}

/**
 * Consolidated roll-up of every board/committee's progress score — one spectrum
 * row each — so the whole governing body's disposition reads at a glance on the
 * dashboard. Boards without a transcript-analysis dataset show as "not yet
 * analyzed" rather than being hidden, so the full slate is visible.
 */
export default function BoardProgress({ muniKey }: { muniKey: string }) {
  const [boards, setBoards] = useState<BoardScore[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/board-scores?muni=${encodeURIComponent(muniKey)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setBoards(d.boards || []))
      .catch(() => setBoards(null))
      .finally(() => setLoading(false))
  }, [muniKey])

  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading board progress…</div>
  if (!boards || boards.length === 0) return null

  const scored = boards.filter((b) => b.score != null).length

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>
        Board progress
        <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {scored} of {boards.length} analyzed</span>
      </h2>
      <div className="muted" style={{ fontSize: 11, marginBottom: 12, lineHeight: 1.5, maxWidth: 720 }}>
        Each board&apos;s progress score — the position-weighted average of its members&apos; sentiment across analyzed meetings — on a −10 (opposed) to +10 (favorable) spectrum.
      </div>
      <div className="card" style={{ padding: 0 }}>
        {boards.map((b, i) => (
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
              {b.score != null ? (
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  {sentimentLabel(b.score)} · {b.positions} positions
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Not yet analyzed</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              {b.score != null ? (
                <ProgressSpectrum score={b.score} height={14} />
              ) : (
                <div style={{ height: 14, borderRadius: 7, background: 'var(--panel-2)', opacity: 0.6 }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
