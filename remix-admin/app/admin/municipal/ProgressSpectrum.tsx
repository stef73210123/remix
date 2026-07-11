'use client'

import { sentimentColor, fmtSent } from './sentiment'

/**
 * A full negative→neutral→positive spectrum with a marker pinned at `score`
 * (the "progress score", −1…+1). Unlike the per-person meter (a fill from the
 * center), this shows the whole scale so a single board/committee's standing
 * reads at a glance and many of them line up comparably in a stack.
 */
export default function ProgressSpectrum({
  score,
  height = 14,
  showValue = true,
  showScale = false,
}: {
  score: number
  height?: number
  showValue?: boolean
  showScale?: boolean
}) {
  const s = Math.max(-1, Math.min(1, score))
  const pct = ((s + 1) / 2) * 100 // 0 (opposed) … 100 (favorable)

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', paddingTop: showValue ? 15 : 6 }}>
        {/* Marker: numeric value above a caret, positioned along the scale. */}
        <div
          style={{
            position: 'absolute', top: 0, left: `${pct}%`, transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, pointerEvents: 'none',
          }}
        >
          {showValue && (
            <span style={{ fontSize: 11, fontWeight: 700, color: sentimentColor(s), fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {fmtSent(s)}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1, marginTop: 1 }}>▼</span>
        </div>
        {/* Spectrum track: coral → slate → green. */}
        <div
          style={{
            height, borderRadius: height / 2, position: 'relative',
            background: `linear-gradient(90deg, ${sentimentColor(-1)} 0%, ${sentimentColor(-0.4)} 27%, ${sentimentColor(0)} 50%, ${sentimentColor(0.4)} 73%, ${sentimentColor(1)} 100%)`,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
          }}
        >
          {/* Center (neutral) tick. */}
          <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'rgba(255,255,255,0.65)' }} />
        </div>
      </div>
      {showScale && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span className="muted" style={{ fontSize: 10 }}>Opposed</span>
          <span className="muted" style={{ fontSize: 10 }}>Neutral</span>
          <span className="muted" style={{ fontSize: 10 }}>Favorable</span>
        </div>
      )}
    </div>
  )
}

/** Weighted-mean progress score over a set of members with attributed positions. */
export function weightedProgressScore(
  members: { avgSentiment: number; totalPositions: number }[],
): { score: number; positions: number; members: number } | null {
  const scored = members.filter((m) => m.totalPositions > 0)
  const positions = scored.reduce((s, m) => s + m.totalPositions, 0)
  if (!positions) return null
  return {
    score: scored.reduce((s, m) => s + m.avgSentiment * m.totalPositions, 0) / positions,
    positions,
    members: scored.length,
  }
}
