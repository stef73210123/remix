'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '@/app/admin/municipal/Breadcrumbs'
import { type TimelineItem } from '@/app/admin/municipal/MeetingTimeline'
import MeetingList from '@/app/admin/municipal/MeetingList'
import ClearableInput from '@/app/ClearableInput'
import type { PermitDataset, DepartmentInfo, PermitRecord } from '@/lib/municipal/permits'
import { getContractorWebsite } from '@/lib/municipal/contractorLinks'
import type { PermitMarker } from '@/app/admin/municipal/JurisdictionMap'
import BoardStaffCards from '@/app/admin/municipal/board/BoardStaffCards'
import BoardKeyDocs from '@/app/admin/municipal/board/BoardKeyDocs'
import { isOpen } from '@/lib/flavor'
import { fmtDateShort } from '@/lib/municipal/date'

const JurisdictionMap = dynamic(() => import('@/app/admin/municipal/JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 440, marginBottom: 30 }} />,
})

// Stable color per normalized permit category (brand-neutral, theme-agnostic).
const CAT_COLOR: Record<string, string> = {
  'HVAC / mechanical': '#5a9bd4',
  'Generator': '#e8813a',
  'Additions & alterations': '#d4767a',
  'Pool / spa': '#0ea5e9',
  'Roofing': '#c9973f',
  'New construction': '#3d9c72',
  'Solar': '#eab308',
  'Deck / porch': '#9b7fd4',
  'Fence / wall': '#8a8f96',
  'Accessory structure': '#a855f7',
  'Siding / windows': '#22a06b',
  'Demolition': '#ca615f',
  'Commercial (general)': '#3b82f6',
  'Fire / alarm': '#ef4444',
  'Sign': '#84cc16',
  'Other / general': '#6b7bb5',
}
const catColor = (c: string) => CAT_COLOR[c] || '#6b7bb5'

function fmtInt(n: number) { return n.toLocaleString('en-US') }
function fmtUSDshort(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n)}`
}
function fmtDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return fmtDateShort(d)
}

// The fuller set of fields from a permit's full report — beyond the address/
// type of work already visible on the collapsed row — shown only once a row
// is expanded, so the collapsed view stays scannable. Permit number lives
// here (not on the collapsed row) since it's an internal reference number,
// not something a resident scanning the list needs up front.
function permitDetailRows(p: PermitRecord): { label: string; value: React.ReactNode }[] {
  const rows: { label: string; value: React.ReactNode }[] = []
  if (p.permitNumber) rows.push({ label: 'Permit #', value: p.permitNumber })
  if (p.description) rows.push({ label: 'Description', value: p.description })
  if (p.owner) rows.push({ label: 'Owner', value: p.owner })
  if (p.contractor) {
    const href = getContractorWebsite(p.contractor)
    rows.push({
      label: 'Contractor',
      value: href
        ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)' }}>{p.contractor} ↗</a>
        : p.contractor,
    })
  }
  if (p.klass) rows.push({ label: 'Property class', value: p.klass })
  if (p.zone) rows.push({ label: 'Zoning district', value: p.zone })
  if (p.cost) rows.push({ label: 'Declared value', value: fmtUSDshort(p.cost) })
  if (p.fee) rows.push({ label: 'Permit fee', value: fmtUSDshort(p.fee) })
  if (p.appIso) rows.push({ label: 'Application filed', value: fmtDate(p.appIso) })
  if (p.permitIso) rows.push({ label: 'Permit issued', value: fmtDate(p.permitIso) })
  if (p.closeIso) rows.push({ label: 'Closed / CO', value: fmtDate(p.closeIso) })
  return rows
}

function permitToTimelineItem(p: PermitRecord): TimelineItem {
  const rows = permitDetailRows(p)
  return {
    key: p.permitNumber || `${p.address}-${p.permitIso}`,
    date: new Date((p.permitIso as string) + 'T00:00:00'),
    subtitle: p.address,
    board: p.category,
    past: true,
    detail: rows.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.5, flexWrap: 'wrap' }}>
            <span className="muted" style={{ minWidth: 128, flexShrink: 0 }}>{r.label}</span>
            <span>{r.value}</span>
          </div>
        ))}
      </div>
    ) : undefined,
  }
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SectionHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
      <h2 style={{ fontSize: 16, margin: 0 }}>
        {title}
        {sub && <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {sub}</span>}
      </h2>
      {right}
    </div>
  )
}

type YearFilter = number | 'ALL'

function YearSelect({ value, years, onChange, allLabel = 'All years' }: {
  value: YearFilter
  years: number[]
  onChange: (v: YearFilter) => void
  allLabel?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
      aria-label="Filter by year"
      style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
    >
      {years.map((y) => <option key={y} value={y}>{y}</option>)}
      <option value="ALL">{allLabel}</option>
    </select>
  )
}

type TypeFilter = string | 'ALL'

function TypeSelect({ value, types, onChange }: {
  value: TypeFilter
  types: string[]
  onChange: (v: TypeFilter) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filter by permit type"
      style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
    >
      <option value="ALL">All types</option>
      {types.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  )
}

type ScatterStage = 'app_permit' | 'permit_co'
const STAGE_LABEL: Record<ScatterStage, string> = {
  app_permit: 'application → permit issued',
  permit_co: 'permit issued → certificate of occupancy',
}

function StageSelect({ value, onChange }: { value: ScatterStage; onChange: (v: ScatterStage) => void }) {
  return (
    <div className="pill-strip" style={{ display: 'flex', gap: 4 }}>
      {([['app_permit', 'Application → Permit'], ['permit_co', 'Permit → CO']] as const).map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className="btn secondary"
          style={{ padding: '4px 10px', fontSize: 12, ...(value === k ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** Horizontal magnitude bars (label · track · value), sorted high→low. */
function BarList({ rows, color }: { rows: { label: string; count: number; extra?: string; href?: string }[]; color?: (label: string) => string }) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: color ? color(r.label) : 'var(--primary)', flex: '0 0 auto' }} />
            {r.href ? (
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--primary-light)' }}
              >
                {r.label}
              </a>
            ) : (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            )}
          </div>
          <div style={{ background: 'var(--panel-2)', borderRadius: 5, height: 16, overflow: 'hidden' }}>
            <div style={{ width: `${(r.count / max) * 100}%`, height: '100%', background: color ? color(r.label) : 'var(--primary)', opacity: 0.85, borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', minWidth: 70, textAlign: 'right' }}>
            {fmtInt(r.count)}{r.extra && <span className="muted"> · {r.extra}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Permits-per-month column chart with a hover readout. Bars have a fixed
 * pixel width (rather than squeezing all history into one static viewBox),
 * so the chart scrolls horizontally — it opens scrolled to 2024, with the
 * full history back to 2018 reachable by scrolling left.
 */
function MonthlyChart({ monthly }: { monthly: { month: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const data = monthly.filter((m) => m.month >= '2018-01')
  const BAR_W = 12
  const AXIS_W = 34
  const H = 200, PAD = { t: 14, r: 8, b: 26, l: 4 }
  const plotW = data.length * BAR_W
  const W = PAD.l + plotW + PAD.r
  const plotH = H - PAD.t - PAD.b
  const max = Math.max(...data.map((d) => d.count), 1)
  const bw = BAR_W
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH
  const hb = hover != null ? data[hover] : null

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const idx = data.findIndex((d) => d.month >= '2024-01')
    el.scrollLeft = idx > 0 ? idx * BAR_W : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length])

  return (
    <div className="card" style={{ padding: '12px 12px 6px' }}>
      <div style={{ display: 'flex' }}>
        {/* Y-axis labels live in their own fixed (non-scrolling) column — the
            bars svg below is many months wide and scrolls horizontally,
            opening scrolled to recent years, so labels drawn inside it would
            be scrolled out of view. */}
        <svg width={AXIS_W} height={H} style={{ flex: '0 0 auto' }} aria-hidden="true">
          {[0, 0.5, 1].map((f) => (
            <text key={f} x={AXIS_W - 6} y={y(max * f) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">{Math.round(max * f)}</text>
          ))}
        </svg>
        <div ref={scrollRef} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, minWidth: 0 }}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }} role="img" aria-label="Permits issued per month">
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1={PAD.l} y1={y(max * f)} x2={W - PAD.r} y2={y(max * f)} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
            ))}
            {data.map((d, i) => (
              <rect key={d.month} x={PAD.l + i * bw + 0.5} y={y(d.count)} width={Math.max(1, bw - 1)} height={PAD.t + plotH - y(d.count)}
                fill="var(--primary)" opacity={hover != null && hover !== i ? 0.4 : 0.85} rx={1} />
            ))}
            {data.map((d, i) => (
              d.month.endsWith('-01') && (
                <text key={d.month} x={PAD.l + i * bw + bw / 2} y={H - 10} textAnchor="middle" fontSize={9} fill="var(--muted)">{d.month.slice(0, 4)}</text>
              )
            ))}
            {data.map((d, i) => (
              <rect key={`h${d.month}`} x={PAD.l + i * bw} y={PAD.t} width={bw} height={plotH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            ))}
            {hb && (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={Math.min(Math.max(PAD.l + hover! * bw - 40, 2), W - 96)} y={2} width={94} height={30} rx={6} fill="var(--panel)" stroke="var(--border)" />
                <text x={Math.min(Math.max(PAD.l + hover! * bw - 40, 2), W - 96) + 8} y={15} fontSize={11} fontWeight={600} fill="var(--text)">{hb.count} permits</text>
                <text x={Math.min(Math.max(PAD.l + hover! * bw - 40, 2), W - 96) + 8} y={27} fontSize={10} fill="var(--muted)">{hb.month}</text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}

/** Round 1/2/5 × 10^k tick values within [minV, maxV] — a log-scale axis helper. */
function logTicks(minV: number, maxV: number): number[] {
  const lo = Math.max(minV, 1)
  const ticks: number[] = []
  const minExp = Math.floor(Math.log10(lo))
  const maxExp = Math.ceil(Math.log10(Math.max(maxV, lo)))
  for (let e = minExp; e <= maxExp; e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e
      if (v >= lo * 0.9 && v <= maxV * 1.1) ticks.push(v)
    }
  }
  return ticks
}

interface ScatterPoint { cost: number; days: number; category: string; label: string }

/** Permit value (log-scale $) vs. days spent in the selected pipeline stage,
 *  colored by normalized permit category — surfaces whether higher-value
 *  projects also take disproportionately longer to move through that stage. */
function ScatterChart({ points }: { points: ScatterPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const valid = points.filter((p) => p.cost > 0 && p.days >= 0)
  const W = 760, H = 320, PAD = { t: 14, r: 16, b: 30, l: 42 }
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b

  if (valid.length === 0) {
    return <div className="muted" style={{ fontSize: 13, padding: 16 }}>No permits with both a declared value and a full application-to-CO date range in this selection.</div>
  }

  const minX = Math.min(...valid.map((p) => p.cost))
  const maxX = Math.max(...valid.map((p) => p.cost))
  // Cap the Y axis at the 90th percentile (with headroom) rather than the true
  // max — a handful of long-tail permits otherwise stretch the axis so far
  // that the typical (much shorter) permits all collapse into a sliver at the
  // bottom. Outliers beyond the cap still plot, clipped to the top edge, so
  // nothing is hidden — just compressed into view.
  const daysSorted = valid.map((p) => p.days).sort((a, b) => a - b)
  const trueMaxY = daysSorted[daysSorted.length - 1] ?? 1
  const maxY = Math.max(14, Math.min(trueMaxY, Math.ceil(percentile(daysSorted, 0.9) * 1.25)))
  const logMin = Math.log10(Math.max(minX, 1))
  const logMax = Math.log10(Math.max(maxX, minX * 1.1, 10))
  const xPos = (v: number) => PAD.l + ((Math.log10(Math.max(v, 1)) - logMin) / (logMax - logMin || 1)) * plotW
  const yPos = (v: number) => Math.max(PAD.t, PAD.t + plotH - (Math.min(v, maxY) / maxY) * plotH)
  const xTicks = logTicks(minX, maxX)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f))
  const hp = hover != null ? valid[hover] : null

  return (
    <div className="card" style={{ padding: '12px 12px 10px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Permit value vs. days to complete, by permit type">
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.l} y1={yPos(t)} x2={W - PAD.r} y2={yPos(t)} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
            <text x={PAD.l - 6} y={yPos(t) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">{fmtInt(t)}d</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={xPos(t)} y={H - 12} textAnchor="middle" fontSize={9} fill="var(--muted)">{fmtUSDshort(t)}</text>
        ))}
        {valid.map((p, i) => {
          const clipped = p.days > maxY
          return (
            <circle
              key={i}
              cx={xPos(p.cost)}
              cy={yPos(p.days)}
              r={hover === i ? 5 : 3.4}
              fill={catColor(p.category)}
              fillOpacity={hover != null && hover !== i ? 0.3 : 0.8}
              stroke={hover === i ? 'var(--text)' : clipped ? catColor(p.category) : 'none'}
              strokeWidth={clipped ? 1.5 : 1}
              strokeDasharray={clipped && hover !== i ? '1.5,1.5' : undefined}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
      </svg>
      <div style={{ minHeight: 18, fontSize: 12, marginTop: 2 }}>
        {hp ? (
          <span>
            <strong>{hp.category}</strong>
            <span className="muted"> · {hp.label} · {fmtUSDshort(hp.cost)} · {fmtInt(hp.days)} days{hp.days > maxY ? ' (off top of chart)' : ''}</span>
          </span>
        ) : null}
      </div>
    </div>
  )
}

const permitYear = (p: PermitRecord) => (p.permitIso ? Number(p.permitIso.slice(0, 4)) : null)

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T00:00:00').getTime()
  const b = new Date(bIso + 'T00:00:00').getTime()
  return Math.round((b - a) / 86_400_000)
}
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}
interface StageStat { n: number; median: number; p25: number; p75: number }
function stageStats(deltas: number[]): StageStat | null {
  const sorted = deltas.filter((d) => d >= 0).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  return {
    n: sorted.length,
    median: Math.round(percentile(sorted, 0.5)),
    p25: Math.round(percentile(sorted, 0.25)),
    p75: Math.round(percentile(sorted, 0.75)),
  }
}
/** Permit lifecycle, in the two intervals the department's own timestamps
 *  support: application → permit issued (plan review & corrections happen
 *  here) and permit issued → closed/CO (inspections happen here). */
function pipelineStats(perms: PermitRecord[]) {
  const stage1: number[] = []
  const stage2: number[] = []
  for (const p of perms) {
    if (p.appIso && p.permitIso) stage1.push(daysBetween(p.appIso, p.permitIso))
    if (p.permitIso && p.closeIso) stage2.push(daysBetween(p.permitIso, p.closeIso))
  }
  return { stage1: stageStats(stage1), stage2: stageStats(stage2) }
}

function PipelineRow({ label, sub, stat, max, color }: { label: string; sub?: string; stat: StageStat | null; max: number; color: string }) {
  if (!stat) {
    return (
      <div style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>No permits with both dates recorded in this range.</div>
      </div>
    )
  }
  const pctP25 = (stat.p25 / max) * 100
  const pctP75 = (stat.p75 / max) * 100
  const pctMedian = (stat.median / max) * 100
  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</span>
          {sub && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{sub}</span>}
        </div>
        <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          <strong>{stat.median}d</strong> <span className="muted">median · P25–P75 {stat.p25}–{stat.p75}d · n={fmtInt(stat.n)}</span>
        </span>
      </div>
      <div style={{ position: 'relative', height: 20, background: 'var(--panel-2)', borderRadius: 6 }}>
        <div
          style={{ position: 'absolute', left: `${pctP25}%`, width: `${Math.max(0.5, pctP75 - pctP25)}%`, top: 0, bottom: 0, background: color, opacity: 0.3, borderRadius: 6 }}
          title={`P25–P75: ${stat.p25}–${stat.p75} days`}
        />
        <div style={{ position: 'absolute', left: `${pctMedian}%`, top: -3, bottom: -3, width: 3, background: color, borderRadius: 2 }} title={`Median: ${stat.median} days`} />
      </div>
    </div>
  )
}

/** Approval pipeline — the two intervals the department's own timestamps
 *  support (application→permit, permit→CO), each as a P25–P75 range bar
 *  with a median tick. */
function PipelineChart({ perms }: { perms: PermitRecord[] }) {
  const stats = useMemo(() => pipelineStats(perms), [perms])
  const max = Math.max(30, stats.stage1?.p75 ?? 0, stats.stage2?.p75 ?? 0) * 1.15
  return (
    <div className="card" style={{ padding: '16px 16px 12px' }}>
      <PipelineRow label="Application → Permit Issued" sub="plan review & corrections" stat={stats.stage1} max={max} color="#5a9bd4" />
      <PipelineRow label="Permit Issued → Certificate of Occupancy" sub="inspections" stat={stats.stage2} max={max} color="#3d9c72" />
    </div>
  )
}

/** Per-year (or all-time) aggregates computed from the full permit set, so the
 *  charts and contractor list can be filtered by year client-side. */
function aggregate(perms: PermitRecord[]) {
  const byCategory = new Map<string, { count: number; cost: number }>()
  const byClass = new Map<string, number>()
  const contractors = new Map<string, { count: number; cost: number }>()
  const buckets: { label: string; min: number; max: number | null; count: number }[] = [
    { label: '<$25K', min: 0, max: 25_000, count: 0 },
    { label: '$25–100K', min: 25_000, max: 100_000, count: 0 },
    { label: '$100–500K', min: 100_000, max: 500_000, count: 0 },
    { label: '$500K–1M', min: 500_000, max: 1_000_000, count: 0 },
    { label: '$1M+', min: 1_000_000, max: null, count: 0 },
  ]
  for (const p of perms) {
    const cat = byCategory.get(p.category) ?? { count: 0, cost: 0 }
    cat.count++; cat.cost += p.cost ?? 0
    byCategory.set(p.category, cat)
    byClass.set(p.klass, (byClass.get(p.klass) ?? 0) + 1)
    if (p.contractor) {
      const c = contractors.get(p.contractor) ?? { count: 0, cost: 0 }
      c.count++; c.cost += p.cost ?? 0
      contractors.set(p.contractor, c)
    }
    if (p.cost != null && p.cost > 0) {
      const b = buckets.find((x) => p.cost! >= x.min && (x.max == null || p.cost! < x.max))
      if (b) b.count++
    }
  }
  return {
    byCategory: Array.from(byCategory, ([category, v]) => ({ category, ...v })).sort((a, b) => b.count - a.count),
    byClass: Array.from(byClass, ([klass, count]) => ({ klass, count })).sort((a, b) => b.count - a.count),
    valuationBuckets: buckets.filter((b) => b.count > 0).map(({ label, count }) => ({ label, count })),
    topContractors: Array.from(contractors, ([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count).slice(0, 10),
  }
}

export default function BuildingClient({ userName, muni }: { userName: string; muni: string }) {
  const [dataset, setDataset] = useState<PermitDataset | null>(null)
  const [dept, setDept] = useState<DepartmentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  // Full record set (lazy) — powers the map's year slider and the per-year charts.
  const [fullPermits, setFullPermits] = useState<PermitRecord[] | null>(null)
  const [mapYear, setMapYear] = useState<YearFilter>('ALL')
  const [chartYear, setChartYear] = useState<YearFilter | null>(null)
  // Shared selection between the permit-activity timeline and the list beneath
  // it — clicking an entry in either highlights and scrolls to the match in the other.
  const [selectedPermitKey, setSelectedPermitKey] = useState<string | null>(null)
  const [contractorYear, setContractorYear] = useState<YearFilter | null>(null)
  const [pipelineYear, setPipelineYear] = useState<YearFilter | null>(null)
  const [scatterYear, setScatterYear] = useState<YearFilter | null>(null)
  const [pipelineType, setPipelineType] = useState<TypeFilter | null>(null)
  const [scatterType, setScatterType] = useState<TypeFilter | null>(null)
  const [contractorType, setContractorType] = useState<TypeFilter | null>(null)
  const [scatterStage, setScatterStage] = useState<ScatterStage>('app_permit')
  const [addressSearch, setAddressSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/permits?muni=${encodeURIComponent(muni)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => { setDataset(d.dataset || null); setDept(d.department || null) })
      .catch(() => { setDataset(null); setDept(null) })
      .finally(() => setLoading(false))
    fetch(`/admin/api/municipal/permits?muni=${encodeURIComponent(muni)}&all=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setFullPermits(d.permits || null))
      .catch(() => setFullPermits(null))
  }, [muni])

  const years = useMemo(() => {
    const ys = new Set<number>()
    for (const p of fullPermits ?? dataset?.recent ?? []) {
      const y = permitYear(p)
      if (y) ys.add(y)
    }
    return Array.from(ys).sort((a, b) => b - a)
  }, [fullPermits, dataset])
  const latestYear = years[0]
  // Dropdown options always include the current year, even before any permits
  // have been filed under it, so residents can pick ahead of the data.
  const dropdownYears = useMemo(() => {
    const ys = new Set(years)
    ys.add(new Date().getFullYear())
    return Array.from(ys).sort((a, b) => b - a)
  }, [years])
  // Charts default to the most recent year with real data once known.
  const activeChartYear: YearFilter = chartYear ?? latestYear ?? 'ALL'
  const activePipelineYear: YearFilter = pipelineYear ?? latestYear ?? 'ALL'
  // Scatter defaults to 2025; contractors default to all years (long-running/
  // rare permits otherwise get filtered down to nothing on a single-year default).
  const activeScatterYear: YearFilter = scatterYear ?? 2025
  const activeContractorYear: YearFilter = contractorYear ?? 'ALL'

  // Permit categories present in the data, for the type-filter dropdowns —
  // pipeline defaults to "New construction" once it's confirmed present, since
  // that's the most consequential permit type; scatter and contractors default
  // to "all types" so nothing is filtered out of view by default.
  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const p of fullPermits ?? dataset?.recent ?? []) if (p.category) cats.add(p.category)
    return Array.from(cats).sort()
  }, [fullPermits, dataset])
  const defaultType: TypeFilter = categories.includes('New construction') ? 'New construction' : 'ALL'
  const activePipelineType: TypeFilter = pipelineType ?? defaultType
  const activeScatterType: TypeFilter = scatterType ?? 'ALL'
  const activeContractorType: TypeFilter = contractorType ?? 'ALL'

  // Map markers: every permit with a street address, filtered by the time
  // slider (the geocoder caps at ~90 pins per view, newest first).
  const permitMarkers = useMemo<PermitMarker[]>(() => {
    const src = fullPermits ?? dataset?.recent ?? []
    return src
      .filter((p) => p.address && /\d/.test(p.address))
      .filter((p) => mapYear === 'ALL' || permitYear(p) === mapYear)
      .sort((a, b) => (b.permitIso || '').localeCompare(a.permitIso || ''))
      .map((p: PermitRecord) => ({
        id: p.permitNumber,
        address: p.address,
        title: p.category,
        sub: [p.type, p.cost ? fmtUSDshort(p.cost) : null, fmtDate(p.permitIso)].filter(Boolean).join(' · '),
        color: catColor(p.category),
      }))
  }, [dataset, fullPermits, mapYear])

  // Links the map and the permit list below it: a row click looks up that
  // permit's marker (by permit number) and flies the map to it; a marker
  // click does the reverse, and also fills the address search so the list —
  // capped to the latest 80 by default — is guaranteed to actually contain
  // the clicked permit (an older permit's marker would otherwise have
  // nothing to highlight in an unfiltered list).
  const selectedPermitMarker = useMemo(
    () => (selectedPermitKey ? permitMarkers.find((m) => m.id === selectedPermitKey) ?? null : null),
    [permitMarkers, selectedPermitKey],
  )
  function handlePermitMarkerClick(p: PermitMarker) {
    setAddressSearch(p.address)
    setSelectedPermitKey(p.id)
  }

  // Chart aggregates for the selected year (all-time falls back to the
  // precomputed dataset until the full set arrives).
  const chartAgg = useMemo(() => {
    if (fullPermits) {
      return aggregate(activeChartYear === 'ALL' ? fullPermits : fullPermits.filter((p) => permitYear(p) === activeChartYear))
    }
    return dataset
      ? { byCategory: dataset.byCategory, byClass: dataset.byClass, valuationBuckets: dataset.valuationBuckets, topContractors: dataset.topContractors }
      : null
  }, [fullPermits, dataset, activeChartYear])
  const contractorRows = useMemo(() => {
    if (fullPermits) {
      const byYear = activeContractorYear === 'ALL' ? fullPermits : fullPermits.filter((p) => permitYear(p) === activeContractorYear)
      const byType = activeContractorType === 'ALL' ? byYear : byYear.filter((p) => p.category === activeContractorType)
      return aggregate(byType).topContractors
    }
    return dataset?.topContractors ?? []
  }, [fullPermits, dataset, activeContractorYear, activeContractorType])
  const pipelinePerms = useMemo(() => {
    const src = fullPermits ?? dataset?.recent ?? []
    const byYear = activePipelineYear === 'ALL' ? src : src.filter((p) => permitYear(p) === activePipelineYear)
    return activePipelineType === 'ALL' ? byYear : byYear.filter((p) => p.category === activePipelineType)
  }, [fullPermits, dataset, activePipelineYear, activePipelineType])
  const scatterPoints = useMemo<ScatterPoint[]>(() => {
    const src = fullPermits ?? dataset?.recent ?? []
    const byYear = activeScatterYear === 'ALL' ? src : src.filter((p) => permitYear(p) === activeScatterYear)
    const filtered = activeScatterType === 'ALL' ? byYear : byYear.filter((p) => p.category === activeScatterType)
    const startKey = scatterStage === 'app_permit' ? 'appIso' : 'permitIso'
    const endKey = scatterStage === 'app_permit' ? 'permitIso' : 'closeIso'
    return filtered
      .filter((p) => p.cost != null && p.cost > 0 && p[startKey] && p[endKey])
      .map((p) => ({ cost: p.cost as number, days: daysBetween(p[startKey] as string, p[endKey] as string), category: p.category, label: p.address }))
      .filter((p) => p.days >= 0)
  }, [fullPermits, dataset, activeScatterYear, activeScatterType, scatterStage])

  // Matching-address results search the full permit set (once loaded) —
  // same source the unfiltered list below now shows in its entirety, so a
  // search only ever narrows what's already there rather than reaching
  // further back than the plain list does.
  const addressTerm = addressSearch.trim().toLowerCase()
  const permitSearchResults = useMemo(() => {
    if (!addressTerm) return null
    const src = fullPermits ?? dataset?.recent ?? []
    return src
      .filter((p) => p.permitIso && p.address?.toLowerCase().includes(addressTerm))
      .sort((a, b) => (b.permitIso || '').localeCompare(a.permitIso || ''))
  }, [fullPermits, dataset, addressTerm])
  // The full permit database, not a recent-N slice — `fullPermits` (the
  // `all=1` fetch) once it's arrived, falling back to `dataset.recent` only
  // for the brief window before it does.
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const src = permitSearchResults ?? (fullPermits ?? dataset?.recent ?? []).filter((p) => p.permitIso)
    return src
      .map(permitToTimelineItem)
      .sort((a, b) => (a.date!.getTime() - b.date!.getTime()))
  }, [dataset, fullPermits, permitSearchResults])
  // Most recent permit date in the dataset — flags how fresh the offline PDF
  // extract actually is, since it doesn't auto-refresh with the Town's own records.
  const latestPermitDate = useMemo(() => {
    if (!dataset) return null
    const dates = dataset.recent.map((p) => p.permitIso).filter((d): d is string => !!d).sort()
    return dates.length ? dates[dates.length - 1] : null
  }, [dataset])

  // OpenNorthCastle is single-jurisdiction, so the town crumb is implied and
  // skipped there; the paywalled Remix build keeps it (multiple towns).
  const crumbs: Crumb[] = [
    { label: 'Dashboard', href: isOpen ? '/' : `/admin/municipal?town=${muni}` },
    ...(isOpen ? [] : [{ label: 'Town of North Castle' }]),
    { label: 'Building Department' },
  ]

  const yearLabel = (v: YearFilter) => (v === 'ALL' ? 'all years' : String(v))

  return (
    <div className="container">
      <MuniHeader userName={userName} />
      <MuniTabs muni={muni} active="building" />
      {!isOpen && <div style={{ marginBottom: 12 }}><Breadcrumbs items={crumbs} /></div>}
      <h1 className="page-title" style={{ marginBottom: 6 }}>Building Department</h1>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading permit data…</div>}
      {!loading && !dataset && <div className="muted" style={{ padding: 20 }}>No permit data available.</div>}

      {dataset && (
        <>
          {/* Departmental staff card — same presentation as the board pages. */}
          <BoardStaffCards muni={muni} bodyKey="building" />

          {/* Fee schedule + permit process, as their own cards. */}
          {dept && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 22 }}>
              <div className="card" style={{ padding: 16 }}>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Fee schedule</div>
                {dept.fees.map((f) => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="muted">{f.label}</span><span style={{ fontWeight: 600 }}>{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Permit process</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {dept.lifecycle.map((s, i) => (
                    <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge state" style={{ fontSize: 11 }}>{s}</span>
                      {i < dept.lifecycle.length - 1 && <span className="muted" style={{ fontSize: 12 }}>→</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Key reference documents (Building Code, Zoning Code). */}
          <BoardKeyDocs muni={muni} bodyKey="building" />

          {/* KPI tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 26 }}>
            <Tile label="Permits on file" value={fmtInt(dataset.totals.permits)} sub={`${dataset.coverage.firstYear}–${dataset.coverage.lastYear}`} />
            <Tile label="Declared construction value" value={fmtUSDshort(dataset.totals.totalCost)} sub={`${fmtInt(dataset.totals.withCost)} permits with a value`} />
            <Tile label="Permit fees collected" value={fmtUSDshort(dataset.totals.totalFees)} sub="10-year total" />
            <Tile label="Median plan-review time" value={dataset.turnaround.medianDays != null ? `${dataset.turnaround.medianDays} days` : '—'} sub={dataset.turnaround.avgDays != null ? `avg ${dataset.turnaround.avgDays} days` : undefined} />
          </div>

          {/* Map — permit addresses only, always on, narrowed by the year dropdown. */}
          <SectionHead
            title="Map"
            sub={`${fmtInt(permitMarkers.length)} permit addresses · ${yearLabel(mapYear)}`}
            right={<YearSelect value={mapYear} years={dropdownYears} onChange={setMapYear} />}
          />
          <JurisdictionMap
            muni={muni}
            permits={permitMarkers}
            onlyPermits
            onPermitClick={handlePermitMarkerClick}
            flyToPermit={selectedPermitMarker}
          />

          {/* Permit database — directly below the map, and linked to it: a row
              click flies the map to that permit's marker, a marker click
              filters/scrolls this list to that permit. */}
          <div style={{ marginBottom: 8 }}>
            <SectionHead
              title="Permit database"
              sub={
                permitSearchResults
                  ? `${fmtInt(permitSearchResults.length)} match${permitSearchResults.length === 1 ? '' : 'es'} for "${addressSearch.trim()}"`
                  : `${fmtInt(timelineItems.length)} permits`
              }
              right={
                <ClearableInput
                  type="text"
                  value={addressSearch}
                  onChange={setAddressSearch}
                  placeholder="Search by address…"
                  className="input"
                  wrapperStyle={{ flex: '1 1 220px', maxWidth: 280 }}
                  style={{ fontSize: 12.5, padding: '5px 10px' }}
                />
              }
            />
            {latestPermitDate && (
              <div className="muted" style={{ fontSize: 11 }}>
                Data current as of {fmtDate(latestPermitDate)} — more recent permit records have been requested from the Building Department.
              </div>
            )}
          </div>
          <MeetingList
            items={timelineItems}
            maxHeight={420}
            emptyText="No permits match that address."
            selectedKey={selectedPermitKey}
            onSelect={setSelectedPermitKey}
          />
          <div style={{ marginBottom: 26 }} />

          {/* Analytics: category + class, filtered by year (default: latest). */}
          <SectionHead
            title="Permit analytics"
            sub={yearLabel(activeChartYear)}
            right={<YearSelect value={activeChartYear} years={dropdownYears} onChange={setChartYear} />}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 26 }}>
            <div>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Permits by type</div>
              <div className="card" style={{ padding: 16 }}>
                {chartAgg && chartAgg.byCategory.length > 0 ? (
                  <BarList rows={chartAgg.byCategory.map((c) => ({ label: c.category, count: c.count, extra: c.cost ? fmtUSDshort(c.cost) : undefined }))} color={catColor} />
                ) : (
                  <div className="muted" style={{ fontSize: 13 }}>No permits in {yearLabel(activeChartYear)}.</div>
                )}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Residential vs. commercial</div>
              <div className="card" style={{ padding: 16 }}>
                {chartAgg && chartAgg.byClass.length > 0 ? (
                  <BarList rows={chartAgg.byClass.map((c) => ({ label: c.klass, count: c.count }))} />
                ) : (
                  <div className="muted" style={{ fontSize: 13 }}>No permits in {yearLabel(activeChartYear)}.</div>
                )}
              </div>
              <div style={{ height: 20 }} />
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Declared value · cost-of-construction bands</div>
              <div className="card" style={{ padding: 16 }}>
                {chartAgg && chartAgg.valuationBuckets.length > 0 ? (
                  <BarList rows={chartAgg.valuationBuckets.map((b) => ({ label: b.label, count: b.count }))} />
                ) : (
                  <div className="muted" style={{ fontSize: 13 }}>No valued permits in {yearLabel(activeChartYear)}.</div>
                )}
              </div>
            </div>
          </div>

          {/* Permits over time */}
          <div style={{ marginBottom: 26 }}>
            <SectionHead title="Permits issued over time" sub="by month" />
            <MonthlyChart monthly={dataset.monthly} />
          </div>

          {/* Approval pipeline — application through Certificate of Occupancy. */}
          <SectionHead
            title="Approval pipeline"
            sub={`application → certificate of occupancy · ${activePipelineType === 'ALL' ? 'all types' : activePipelineType} · ${yearLabel(activePipelineYear)}`}
            right={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {categories.length > 0 && <TypeSelect value={activePipelineType} types={categories} onChange={setPipelineType} />}
                <YearSelect value={activePipelineYear} years={dropdownYears} onChange={setPipelineYear} />
              </div>
            }
          />
          <div style={{ marginBottom: 26 }}>
            <PipelineChart perms={pipelinePerms} />
          </div>

          {/* Value vs. duration — does a bigger declared value predict a longer timeline? */}
          <SectionHead
            title="Permit value vs. time to complete"
            sub={`${STAGE_LABEL[scatterStage]} · ${activeScatterType === 'ALL' ? 'all types' : activeScatterType} · ${yearLabel(activeScatterYear)}`}
            right={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StageSelect value={scatterStage} onChange={setScatterStage} />
                {categories.length > 0 && <TypeSelect value={activeScatterType} types={categories} onChange={setScatterType} />}
                <YearSelect value={activeScatterYear} years={dropdownYears} onChange={setScatterYear} />
              </div>
            }
          />
          <div style={{ marginBottom: 26 }}>
            <ScatterChart points={scatterPoints} />
          </div>

          {/* Top contractors */}
          <SectionHead
            title="Most active contractors"
            sub={`by permit count · ${activeContractorType === 'ALL' ? 'all types' : activeContractorType} · ${yearLabel(activeContractorYear)}`}
            right={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {categories.length > 0 && <TypeSelect value={activeContractorType} types={categories} onChange={setContractorType} />}
                <YearSelect value={activeContractorYear} years={dropdownYears} onChange={setContractorYear} />
              </div>
            }
          />
          <div className="card" style={{ padding: 16, marginBottom: 26 }}>
            {contractorRows.length > 0 ? (
              <BarList rows={contractorRows.map((c) => ({ label: c.name, count: c.count, extra: c.cost ? fmtUSDshort(c.cost) : undefined, href: getContractorWebsite(c.name) }))} />
            ) : (
              <div className="muted" style={{ fontSize: 13 }}>No contractor-attributed permits in {yearLabel(activeContractorYear)}.</div>
            )}
          </div>

          <div className="muted" style={{ fontSize: 11, marginTop: 18, lineHeight: 1.5 }}>{dataset.source}</div>
        </>
      )}
    </div>
  )
}
