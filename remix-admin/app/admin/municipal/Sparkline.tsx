'use client'

import type { MonthlyIssueVolume } from '@/lib/municipal/analysis'

export const SPARK_W = 64
export const SPARK_H = 18

/**
 * Trailing-months volume trend, shared by the Local Issues panel and each
 * board's "Themes across the year" list: a full-width baseline plus a
 * connecting line, no per-point markers, so the row can spend more of its
 * width on the theme name. Height encodes volume off a zero baseline rather
 * than diverging from a midline, since volume is never negative.
 */
export default function Sparkline({ points }: { points: MonthlyIssueVolume[] }) {
  if (points.length === 0) {
    return <span className="muted" style={{ fontSize: 10, width: SPARK_W, display: 'inline-block', textAlign: 'center', flexShrink: 0 }}>—</span>
  }
  const n = points.length
  const maxV = Math.max(1, ...points.map((p) => p.volume))
  const x = (i: number) => (n === 1 ? SPARK_W / 2 : (i / (n - 1)) * SPARK_W)
  const y = (v: number) => SPARK_H - 2 - (v / maxV) * (SPARK_H - 4)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.volume).toFixed(1)}`).join(' ')
  return (
    <svg width={SPARK_W} height={SPARK_H} style={{ display: 'block', flexShrink: 0 }} aria-hidden>
      <line x1={0} y1={SPARK_H - 2} x2={SPARK_W} y2={SPARK_H - 2} stroke="var(--border)" strokeWidth={1} />
      {n > 1 && <path d={d} fill="none" stroke="var(--muted)" strokeWidth={1.5} />}
    </svg>
  )
}
