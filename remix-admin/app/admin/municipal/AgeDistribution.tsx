'use client'

import { useEffect, useMemo, useState } from 'react'
import type { TownDemographics, AgeVintage, AgeBin } from '@/lib/municipal/demographics'

// School-age bands (approx.), aligned to the Byram Hills grade structure.
const SCHOOL_BANDS = [
  { label: 'Elementary', short: 'K–5', a: 5, b: 11, color: '#3d9c72' },
  { label: 'Middle', short: '6–8', a: 11, b: 14, color: '#5a9bd4' },
  { label: 'High', short: '9–12', a: 14, b: 18, color: '#c7913c' },
]

// Full age range; the open-ended 85+ bin draws as 85–90 on the axis.
const AGE_MAX = 90
const W = 760
const H = 300
const PAD = { top: 40, right: 16, bottom: 40, left: 48 }
const BAR = '#6b7bb5' // muted indigo, distinct from the band hues

export default function AgeDistribution({ muniKey }: { muniKey: string }) {
  const [demo, setDemo] = useState<TownDemographics | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<number | null>(null)
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    setYear(null)
    fetch(`/admin/api/municipal/demographics?muni=${encodeURIComponent(muniKey)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setDemo(d.demo || null))
      .catch(() => setDemo(null))
      .finally(() => setLoading(false))
  }, [muniKey])

  const vintages: AgeVintage[] = useMemo(() => demo?.ageDistribution ?? [], [demo])
  const years = useMemo(() => vintages.map((v) => v.year), [vintages])
  // Default to the most recent ACS vintage; the dropdown swaps the bars.
  const activeYear = year ?? years[years.length - 1] ?? null
  const selected = vintages.find((v) => v.year === activeYear) ?? vintages[vintages.length - 1]
  const earliest = vintages.length > 1 ? vintages[0] : null
  // The dashed change-over-time overlay compares against the earliest vintage;
  // it hides when the earliest itself is selected (it would trace the bars).
  const compare = earliest && selected && earliest.year !== selected.year ? earliest : null

  // Gross residents per bin; fall back to the pct share only if a vintage
  // somehow arrives without counts (units then read as %).
  const hasCounts = vintages.some((v) => v.bins.some((b) => b.count != null))
  const val = (b: AgeBin) => (hasCounts ? b.count ?? 0 : b.pct)
  const fmtVal = (n: number) => (hasCounts ? Math.round(n).toLocaleString('en-US') : `${n.toFixed(0)}%`)

  // Scale across every vintage so switching years keeps a stable axis.
  const maxVal = useMemo(() => {
    let m = 1
    for (const v of vintages) for (const b of v.bins) m = Math.max(m, hasCounts ? b.count ?? 0 : b.pct)
    return m
  }, [vintages, hasCounts])

  if (loading) return <div className="muted" style={{ fontSize: 13, gridColumn: '1 / -1' }}>Loading age distribution…</div>
  if (!selected || selected.bins.length === 0) return null

  const visBins = selected.bins
  const compareBins = compare ? compare.bins : null

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const xA = (age: number) => PAD.left + (Math.min(age, AGE_MAX) / AGE_MAX) * plotW
  const yV = (v: number) => PAD.top + plotH - (v / maxVal) * plotH
  const binEnd = (b: AgeBin) => b.max ?? AGE_MAX

  // Comparison-vintage line through bin centers (to show the shift over time).
  const linePath = compareBins
    ? compareBins
        .map((b, i) => `${i === 0 ? 'M' : 'L'}${xA((b.min + binEnd(b)) / 2).toFixed(1)},${yV(val(b)).toFixed(1)}`)
        .join(' ')
    : ''

  const hb = hover != null ? visBins[hover] : null
  const eb = hb && compareBins ? compareBins[hover!] : null

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 4px' }}>
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Age distribution
          {compare && <span> · change since {compare.year}</span>}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }} className="muted">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: BAR, display: 'inline-block' }} /> {selected.year}
            </span>
            {compare && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--muted)', display: 'inline-block' }} /> {compare.year}
              </span>
            )}
          </div>
          {years.length > 1 && (
            <select
              value={activeYear ?? ''}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="ACS vintage year"
              style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {[...years].sort((a, b) => b - a).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="muted" style={{ fontSize: 11, marginBottom: 10, lineHeight: 1.5, maxWidth: 720 }}>
        Residents by 5-year age band (U.S. Census ACS), in gross numbers, across the whole population. Shaded bands mark the school-age ranges; hover a bar for the exact count and its change over time.
      </div>

      <div className="card" style={{ padding: '14px 12px 8px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Residents by age band over time">
          {/* School-age bands */}
          {SCHOOL_BANDS.map((s) => (
            <g key={s.label}>
              <rect x={xA(s.a)} y={PAD.top} width={xA(s.b) - xA(s.a)} height={plotH} fill={s.color} opacity={0.14} />
              <text x={(xA(s.a) + xA(s.b)) / 2} y={PAD.top - 20} textAnchor="middle" fontSize={10} fontWeight={700} fill={s.color}>{s.label}</text>
              <text x={(xA(s.a) + xA(s.b)) / 2} y={PAD.top - 8} textAnchor="middle" fontSize={9} fill="var(--muted)">{s.short}</text>
            </g>
          ))}

          {/* Y gridlines + labels (gross residents) */}
          {Array.from({ length: 4 }, (_, i) => {
            const v = (maxVal / 3) * i
            return (
              <g key={i}>
                <line x1={PAD.left} y1={yV(v)} x2={W - PAD.right} y2={yV(v)} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
                <text x={PAD.left - 6} y={yV(v) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">{fmtVal(v)}</text>
              </g>
            )
          })}

          {/* Bars (selected vintage) */}
          {visBins.map((b, i) => {
            const x0 = xA(b.min)
            const x1 = xA(binEnd(b))
            const w = Math.max(1, x1 - x0 - 2)
            const dim = hover != null && hover !== i
            return (
              <rect key={i} x={x0 + 1} y={yV(val(b))} width={w} height={PAD.top + plotH - yV(val(b))}
                fill={BAR} opacity={dim ? 0.45 : 0.92} rx={2} />
            )
          })}

          {/* Comparison line (earliest vintage) */}
          {compareBins && <path d={linePath} fill="none" stroke="var(--muted)" strokeWidth={1.75} strokeDasharray="4 3" />}
          {compareBins && compareBins.map((b, i) => (
            <circle key={i} cx={xA((b.min + binEnd(b)) / 2)} cy={yV(val(b))} r={2} fill="var(--muted)" />
          ))}

          {/* X ticks */}
          {[0, 10, 20, 30, 40, 50, 60, 70, 80].map((age) => (
            <text key={age} x={xA(age)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fill="var(--muted)">{age}</text>
          ))}
          <text x={xA(87.5)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fill="var(--muted)">85+</text>
          <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">Age (years)</text>

          {/* Hover capture (per bin) + tooltip */}
          {visBins.map((b, i) => {
            const x0 = xA(b.min)
            const x1 = xA(binEnd(b))
            return (
              <rect key={i} x={x0} y={PAD.top} width={x1 - x0} height={plotH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
            )
          })}
          {hb && (() => {
            const delta = eb ? val(hb) - val(eb) : null
            const lines = [
              `Age ${hb.label}`,
              `${selected.year}: ${fmtVal(val(hb))}${hasCounts ? ' residents' : ''}`,
              ...(eb && delta != null
                ? [`${compare!.year}: ${fmtVal(val(eb))}${hasCounts ? ' residents' : ''}`,
                   `Change: ${delta >= 0 ? '+' : ''}${hasCounts ? Math.round(delta).toLocaleString('en-US') : `${delta.toFixed(1)} pts`}`]
                : []),
            ]
            const tw = Math.max(...lines.map((l) => l.length)) * 6.6 + 18
            const th = 15 * lines.length + 12
            const cx = (xA(hb.min) + xA(binEnd(hb))) / 2
            const tx = Math.min(Math.max(cx - tw / 2, 4), W - tw - 4)
            const ty = Math.max(yV(val(hb)) - th - 8, 4)
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
