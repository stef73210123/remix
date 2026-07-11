'use client'

import { useEffect, useMemo, useState } from 'react'
import type { TownDemographics, AgeVintage } from '@/lib/municipal/demographics'

// School-age bands (approx.), aligned to the Byram Hills grade structure.
const SCHOOL_BANDS = [
  { label: 'Elementary', short: 'K–5', a: 5, b: 11, color: '#3d9c72' },
  { label: 'Middle', short: '6–8', a: 11, b: 14, color: '#5a9bd4' },
  { label: 'High', short: '9–12', a: 14, b: 18, color: '#c7913c' },
]

const AGE_MAX = 90
const W = 760
const H = 300
const PAD = { top: 40, right: 16, bottom: 40, left: 42 }
const BAR = '#6b7bb5' // muted indigo, distinct from the band hues

export default function AgeDistribution({ muniKey }: { muniKey: string }) {
  const [demo, setDemo] = useState<TownDemographics | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/demographics?muni=${encodeURIComponent(muniKey)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setDemo(d.demo || null))
      .catch(() => setDemo(null))
      .finally(() => setLoading(false))
  }, [muniKey])

  const vintages: AgeVintage[] = demo?.ageDistribution ?? []
  const latest = vintages[vintages.length - 1]
  const earliest = vintages.length > 1 ? vintages[0] : null

  const maxPct = useMemo(() => {
    let m = 1
    for (const v of vintages) for (const b of v.bins) m = Math.max(m, b.pct)
    return m
  }, [vintages])

  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading age distribution…</div>
  if (!latest || latest.bins.length === 0) return null

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const xA = (age: number) => PAD.left + (Math.min(age, AGE_MAX) / AGE_MAX) * plotW
  const yP = (pct: number) => PAD.top + plotH - (pct / maxPct) * plotH

  // Earliest-vintage line through bin centers (to show the shift over time).
  const linePath = earliest
    ? earliest.bins
        .map((b, i) => `${i === 0 ? 'M' : 'L'}${xA(b.min + 2.5).toFixed(1)},${yP(b.pct).toFixed(1)}`)
        .join(' ')
    : ''

  const hb = hover != null ? latest.bins[hover] : null
  const eb = hb && earliest ? earliest.bins[hover!] : null

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 4px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          Age distribution
          {earliest && <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {earliest.year} → {latest.year}</span>}
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }} className="muted">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: BAR, display: 'inline-block' }} /> {latest.year}
          </span>
          {earliest && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--muted)', display: 'inline-block' }} /> {earliest.year}
            </span>
          )}
        </div>
      </div>
      <div className="muted" style={{ fontSize: 11, marginBottom: 10, lineHeight: 1.5, maxWidth: 720 }}>
        Residents by 5-year age band (U.S. Census ACS). Shaded bands mark the Byram Hills school-age ranges; hover a bar for the exact share and its change over time.
      </div>

      <div className="card" style={{ padding: '14px 12px 8px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Population by age band over time">
          {/* School-age bands */}
          {SCHOOL_BANDS.map((s) => (
            <g key={s.label}>
              <rect x={xA(s.a)} y={PAD.top} width={xA(s.b) - xA(s.a)} height={plotH} fill={s.color} opacity={0.14} />
              <text x={(xA(s.a) + xA(s.b)) / 2} y={PAD.top - 20} textAnchor="middle" fontSize={11} fontWeight={700} fill={s.color}>{s.label}</text>
              <text x={(xA(s.a) + xA(s.b)) / 2} y={PAD.top - 8} textAnchor="middle" fontSize={9} fill="var(--muted)">{s.short}</text>
            </g>
          ))}

          {/* Y gridlines + labels */}
          {Array.from({ length: 4 }, (_, i) => {
            const pct = (maxPct / 3) * i
            return (
              <g key={i}>
                <line x1={PAD.left} y1={yP(pct)} x2={W - PAD.right} y2={yP(pct)} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
                <text x={PAD.left - 6} y={yP(pct) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">{pct.toFixed(0)}%</text>
              </g>
            )
          })}

          {/* Bars (latest) */}
          {latest.bins.map((b, i) => {
            const x0 = xA(b.min)
            const x1 = xA(b.max ?? AGE_MAX)
            const w = Math.max(1, x1 - x0 - 2)
            const dim = hover != null && hover !== i
            return (
              <rect key={i} x={x0 + 1} y={yP(b.pct)} width={w} height={PAD.top + plotH - yP(b.pct)}
                fill={BAR} opacity={dim ? 0.45 : 0.92} rx={2} />
            )
          })}

          {/* Earliest line */}
          {earliest && <path d={linePath} fill="none" stroke="var(--muted)" strokeWidth={1.75} strokeDasharray="4 3" />}
          {earliest && earliest.bins.map((b, i) => (
            <circle key={i} cx={xA(b.min + 2.5)} cy={yP(b.pct)} r={2} fill="var(--muted)" />
          ))}

          {/* X ticks */}
          {[0, 20, 40, 60, 80].map((age) => (
            <text key={age} x={xA(age)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fill="var(--muted)">{age}</text>
          ))}
          <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">Age (years)</text>

          {/* Hover capture (per bin) + tooltip */}
          {latest.bins.map((b, i) => {
            const x0 = xA(b.min)
            const x1 = xA(b.max ?? AGE_MAX)
            return (
              <rect key={i} x={x0} y={PAD.top} width={x1 - x0} height={plotH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
            )
          })}
          {hb && (() => {
            const lines = [
              `Age ${hb.label}`,
              `${latest.year}: ${hb.pct.toFixed(1)}%`,
              ...(eb ? [`${earliest!.year}: ${eb.pct.toFixed(1)}%`, `Change: ${hb.pct - eb.pct >= 0 ? '+' : ''}${(hb.pct - eb.pct).toFixed(1)} pts`] : []),
            ]
            const tw = Math.max(...lines.map((l) => l.length)) * 6.6 + 18
            const th = 15 * lines.length + 12
            const cx = (xA(hb.min) + xA(hb.max ?? AGE_MAX)) / 2
            const tx = Math.min(Math.max(cx - tw / 2, 4), W - tw - 4)
            const ty = Math.max(yP(hb.pct) - th - 8, 4)
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={tx} y={ty} width={tw} height={th} rx={7} fill="var(--panel)" stroke="var(--border)" opacity={0.98} />
                {lines.map((l, i) => (
                  <text key={i} x={tx + 9} y={ty + 17 + i * 15} fontSize={i === 0 ? 12 : 11} fontWeight={i === 0 ? 600 : 400}
                    fill={i === 0 ? 'var(--text)' : 'var(--muted)'}>{l}</text>
                ))}
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}
