'use client'

import { useMemo, useState } from 'react'
import type { MemberEvidence, MemberProfile } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent } from '../sentiment'
import { fmtDateShort as fmtDateCompact } from '@/lib/municipal/date'

function fmtDateShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return fmtDateCompact(d)
}

type Bucket = 'favor' | 'neutral' | 'oppose'
// Representative score per bucket picks its slice/legend color off the same
// diverging scale used everywhere else on the profile (green/slate/coral) —
// this is directional sentiment attribution, not a roll-call vote record, so
// buckets are named to match (no "abstained" — the transcripts don't carry one).
const BUCKETS: { key: Bucket; label: string; repScore: number }[] = [
  { key: 'favor', label: 'Supportive', repScore: 0.6 },
  { key: 'neutral', label: 'Neutral / mixed', repScore: 0 },
  { key: 'oppose', label: 'Opposed', repScore: -0.6 },
]
function bucketOf(score: number): Bucket {
  if (score >= 0.15) return 'favor'
  if (score <= -0.15) return 'oppose'
  return 'neutral'
}

/** Donut of a member's attributed positions grouped into three dispositions,
 *  with a case list to the right that filters to the clicked slice. */
export default function MemberPositionsDonut({ profile }: { profile: MemberProfile }) {
  const [selected, setSelected] = useState<Bucket | null>(null)

  const grouped = useMemo(() => {
    const g: Record<Bucket, MemberEvidence[]> = { favor: [], neutral: [], oppose: [] }
    for (const e of profile.evidence) g[bucketOf(e.score)].push(e)
    for (const k of Object.keys(g) as Bucket[]) g[k].sort((a, b) => b.date.localeCompare(a.date))
    return g
  }, [profile])

  const total = profile.evidence.length
  if (total === 0) return null

  const counts = BUCKETS.map((b) => ({ ...b, n: grouped[b.key].length }))
  const visible = selected ? grouped[selected] : [...profile.evidence].sort((a, b) => b.date.localeCompare(a.date))

  const size = 140
  const thickness = 22
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const gap = 2
  let offset = 0

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Positions by disposition
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Positions by disposition">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={thickness} />
            <g transform={`rotate(-90 ${cx} ${cy})`}>
              {counts.map((b) => {
                const frac = total > 0 ? b.n / total : 0
                const len = frac * circumference
                const dash = Math.max(len - (b.n > 0 ? gap : 0), 0)
                const isSel = selected === b.key
                const dimmed = !!selected && !isSel
                const el = (
                  <circle
                    key={b.key}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={sentimentColor(b.repScore)}
                    strokeWidth={isSel ? thickness + 4 : thickness}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    opacity={dimmed ? 0.35 : 1}
                    style={{ cursor: b.n > 0 ? 'pointer' : 'default', transition: 'opacity .15s ease, stroke-width .15s ease' }}
                    onClick={() => b.n > 0 && setSelected(isSel ? null : b.key)}
                  >
                    <title>{`${b.label}: ${b.n} (${total > 0 ? Math.round((b.n / total) * 100) : 0}%)`}</title>
                  </circle>
                )
                offset += len
                return el
              })}
            </g>
            <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 20, fontWeight: 700, fill: 'var(--fg)' }}>
              {total}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 9.5, fill: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              positions
            </text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {counts.map((b) => (
              <button
                key={b.key}
                onClick={() => b.n > 0 && setSelected(selected === b.key ? null : b.key)}
                disabled={b.n === 0}
                className="btn secondary"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, textAlign: 'left',
                  padding: '4px 8px', border: 'none', background: selected === b.key ? 'var(--panel-2)' : 'transparent',
                  opacity: selected && selected !== b.key ? 0.45 : 1, cursor: b.n > 0 ? 'pointer' : 'default',
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 2, background: sentimentColor(b.repScore), flexShrink: 0 }} />
                <span style={{ color: 'var(--muted)', flex: 1 }}>{b.label}</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{b.n}</span>
              </button>
            ))}
            {selected && (
              <button onClick={() => setSelected(null)} className="btn secondary" style={{ fontSize: 11, padding: '3px 8px', marginTop: 4 }}>
                Clear filter
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 240 }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
            {selected ? BUCKETS.find((b) => b.key === selected)!.label : 'All positions'} · {visible.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
            {visible.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>No positions in this category.</div>
            ) : (
              visible.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ ...sentimentChipStyle(e.score), flexShrink: 0, marginTop: 2 }}>{fmtSent(e.score)}</span>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>{e.case}</span>
                    <span className="muted" style={{ fontSize: 11 }}> · {fmtDateShort(e.date)} · {e.stance}</span>
                    <div className="muted" style={{ marginTop: 2 }}>{e.evidence}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
