'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '@/app/admin/municipal/Breadcrumbs'
import CivicActions from '@/app/admin/municipal/CivicActions'
import MeetingTimeline, { type TimelineItem } from '@/app/admin/municipal/MeetingTimeline'
import MeetingList from '@/app/admin/municipal/MeetingList'
import type { PermitDataset, DepartmentInfo, PermitRecord } from '@/lib/municipal/permits'
import type { PermitMarker } from '@/app/admin/municipal/JurisdictionMap'
import { isOpen } from '@/lib/flavor'

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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

/** Horizontal magnitude bars (label · track · value), sorted high→low. */
function BarList({ rows, color }: { rows: { label: string; count: number; extra?: string }[]; color?: (label: string) => string }) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: color ? color(r.label) : 'var(--primary)', flex: '0 0 auto' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
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

/** Permits-per-month column chart with a hover readout. */
function MonthlyChart({ monthly }: { monthly: { month: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const data = monthly.filter((m) => m.month >= '2018-01')
  const W = 760, H = 200, PAD = { t: 14, r: 8, b: 26, l: 30 }
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b
  const max = Math.max(...data.map((d) => d.count), 1)
  const bw = plotW / data.length
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH
  const hb = hover != null ? data[hover] : null
  return (
    <div className="card" style={{ padding: '12px 12px 6px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Permits issued per month">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} y1={y(max * f)} x2={W - PAD.r} y2={y(max * f)} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
            <text x={PAD.l - 5} y={y(max * f) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">{Math.round(max * f)}</text>
          </g>
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
/** Full permit lifecycle, in the two intervals the data actually timestamps:
 *  application → permit issued (plan review & corrections happen here) and
 *  permit issued → closed/CO (inspections happen here) — plus the direct
 *  application → close span for a true end-to-end median. */
function pipelineStats(perms: PermitRecord[]) {
  const stage1: number[] = []
  const stage2: number[] = []
  const full: number[] = []
  for (const p of perms) {
    if (p.appIso && p.permitIso) stage1.push(daysBetween(p.appIso, p.permitIso))
    if (p.permitIso && p.closeIso) stage2.push(daysBetween(p.permitIso, p.closeIso))
    if (p.appIso && p.closeIso) full.push(daysBetween(p.appIso, p.closeIso))
  }
  return { stage1: stageStats(stage1), stage2: stageStats(stage2), full: stageStats(full) }
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
 *  support (application→permit, permit→CO) plus the full application→CO
 *  span, each as a P25–P75 range bar with a median tick. */
function PipelineChart({ perms }: { perms: PermitRecord[] }) {
  const stats = useMemo(() => pipelineStats(perms), [perms])
  const max = Math.max(30, stats.stage1?.p75 ?? 0, stats.stage2?.p75 ?? 0, stats.full?.p75 ?? 0) * 1.15
  return (
    <div className="card" style={{ padding: '16px 16px 12px' }}>
      <PipelineRow label="Application → Permit Issued" sub="plan review & corrections" stat={stats.stage1} max={max} color="#5a9bd4" />
      <PipelineRow label="Permit Issued → Certificate of Occupancy" sub="inspections" stat={stats.stage2} max={max} color="#3d9c72" />
      <PipelineRow label="Full pipeline: Application → CO" sub="all stages" stat={stats.full} max={max} color="var(--primary)" />
      <div className="muted" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
        Each bar spans the 25th–75th percentile; the tick marks the median. Based on permits with both dates recorded for the selected year.
      </div>
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
  // Charts default to the most recent year once the year list is known.
  const activeChartYear: YearFilter = chartYear ?? latestYear ?? 'ALL'
  const activeContractorYear: YearFilter = contractorYear ?? latestYear ?? 'ALL'
  const activePipelineYear: YearFilter = pipelineYear ?? latestYear ?? 'ALL'

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
      return aggregate(activeContractorYear === 'ALL' ? fullPermits : fullPermits.filter((p) => permitYear(p) === activeContractorYear)).topContractors
    }
    return dataset?.topContractors ?? []
  }, [fullPermits, dataset, activeContractorYear])
  const pipelinePerms = useMemo(() => {
    const src = fullPermits ?? dataset?.recent ?? []
    return activePipelineYear === 'ALL' ? src : src.filter((p) => permitYear(p) === activePipelineYear)
  }, [fullPermits, dataset, activePipelineYear])

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!dataset) return []
    return dataset.recent
      .filter((p) => p.permitIso)
      .slice(0, 80)
      .map((p) => ({
        key: p.permitNumber || `${p.address}-${p.permitIso}`,
        date: new Date((p.permitIso as string) + 'T00:00:00'),
        title: p.address + (p.description ? ` — ${p.description}` : ''),
        board: p.category,
        town: p.cost ? fmtUSDshort(p.cost) : undefined,
        past: true,
        links: p.permitNumber ? <span className="badge">#{p.permitNumber}</span> : undefined,
      }))
      .sort((a, b) => (a.date!.getTime() - b.date!.getTime()))
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
      <div style={{ marginBottom: 12 }}><Breadcrumbs items={crumbs} /></div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ marginBottom: 6 }}>Building Department</h1>
        {!isOpen && <CivicActions style={{ marginTop: 6 }} />}
      </div>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading permit data…</div>}
      {!loading && !dataset && <div className="muted" style={{ padding: 20 }}>No permit data available.</div>}

      {dataset && (
        <>
          {/* Department info + fees */}
          {dept && (
            <div className="card" style={{ padding: 16, marginBottom: 22 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ maxWidth: 620 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{dept.inspector}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>{dept.mission}</div>
                  <div style={{ fontSize: 12.5, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                    <span>📞 {dept.phone}</span>
                    <a href={`mailto:${dept.email}`} style={{ color: 'var(--primary-light)' }}>✉ {dept.email}</a>
                    <span className="muted">📍 {dept.address}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                    {dept.links.map((l) => (
                      <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--primary-light)' }}>{l.label} ↗</a>
                    ))}
                  </div>
                </div>
                <div style={{ minWidth: 180 }}>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Fee schedule</div>
                  {dept.fees.map((f) => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className="muted">{f.label}</span><span style={{ fontWeight: 600 }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Permit lifecycle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                {dept.lifecycle.map((s, i) => (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span className="badge state" style={{ fontSize: 11 }}>{s}</span>
                    {i < dept.lifecycle.length - 1 && <span className="muted" style={{ fontSize: 12 }}>→</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

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
            right={years.length > 0 ? <YearSelect value={mapYear} years={years} onChange={setMapYear} /> : undefined}
          />
          <div className="muted" style={{ fontSize: 11, marginBottom: 10, lineHeight: 1.5, maxWidth: 720 }}>
            Permit addresses always shown (pins geocode in as they resolve; color = permit type). Use the dropdown to narrow to a single year.
          </div>
          <JurisdictionMap muni={muni} permits={permitMarkers} onlyPermits />

          {/* Recent permit activity — directly below the map. */}
          <div style={{ marginBottom: 8 }}><SectionHead title="Recent permit activity" sub={`latest ${Math.min(80, timelineItems.length)} permits issued`} /></div>
          <MeetingTimeline
            items={timelineItems}
            selectedKey={selectedPermitKey}
            onSelect={setSelectedPermitKey}
            emptyText="No recent permits."
          />
          <MeetingList
            items={timelineItems}
            maxHeight={340}
            emptyText="No recent permits."
            selectedKey={selectedPermitKey}
            onSelect={setSelectedPermitKey}
          />
          <div style={{ marginBottom: 26 }} />

          {/* Analytics: category + class, filtered by year (default: latest). */}
          <SectionHead
            title="Permit analytics"
            sub={yearLabel(activeChartYear)}
            right={years.length > 0 ? <YearSelect value={activeChartYear} years={years} onChange={setChartYear} /> : undefined}
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
            sub={`application → certificate of occupancy · ${yearLabel(activePipelineYear)}`}
            right={years.length > 0 ? <YearSelect value={activePipelineYear} years={years} onChange={setPipelineYear} /> : undefined}
          />
          <div style={{ marginBottom: 26 }}>
            <PipelineChart perms={pipelinePerms} />
          </div>

          {/* Top contractors */}
          <SectionHead
            title="Most active contractors"
            sub={`by permit count · ${yearLabel(activeContractorYear)}`}
            right={years.length > 0 ? <YearSelect value={activeContractorYear} years={years} onChange={setContractorYear} /> : undefined}
          />
          <div className="card" style={{ padding: 16, marginBottom: 26 }}>
            {contractorRows.length > 0 ? (
              <BarList rows={contractorRows.map((c) => ({ label: c.name, count: c.count, extra: c.cost ? fmtUSDshort(c.cost) : undefined }))} />
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
