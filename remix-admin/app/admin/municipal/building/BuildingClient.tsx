'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import Breadcrumbs, { type Crumb } from '@/app/admin/municipal/Breadcrumbs'
import CivicActions from '@/app/admin/municipal/CivicActions'
import MeetingTimeline, { type TimelineItem } from '@/app/admin/municipal/MeetingTimeline'
import MeetingList from '@/app/admin/municipal/MeetingList'
import type { PermitDataset, DepartmentInfo, PermitRecord } from '@/lib/municipal/permits'
import type { PermitMarker } from '@/app/admin/municipal/JurisdictionMap'

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

const POS = '#3d9c72'
function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
      {title}
      {sub && <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {sub}</span>}
    </h2>
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

export default function BuildingClient({ userName, muni }: { userName: string; muni: string }) {
  const [dataset, setDataset] = useState<PermitDataset | null>(null)
  const [dept, setDept] = useState<DepartmentInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/permits?muni=${encodeURIComponent(muni)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => { setDataset(d.dataset || null); setDept(d.department || null) })
      .catch(() => { setDataset(null); setDept(null) })
      .finally(() => setLoading(false))
  }, [muni])

  const permitMarkers = useMemo<PermitMarker[]>(() => {
    if (!dataset) return []
    return dataset.recent
      .filter((p) => p.address && /\d/.test(p.address))
      .map((p: PermitRecord) => ({
        id: p.permitNumber,
        address: p.address,
        title: p.category,
        sub: [p.type, p.cost ? fmtUSDshort(p.cost) : null, fmtDate(p.permitIso)].filter(Boolean).join(' · '),
        color: catColor(p.category),
      }))
  }, [dataset])

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

  const crumbs: Crumb[] = [
    { label: 'Dashboard', href: `/admin/municipal?town=${muni}` },
    { label: 'Town of North Castle' },
    { label: 'Building Department' },
  ]

  return (
    <div className="container">
      <MuniHeader userName={userName} />
      <div style={{ marginBottom: 12 }}><Breadcrumbs items={crumbs} /></div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ marginBottom: 6 }}>Building Department</h1>
        <CivicActions style={{ marginTop: 6 }} />
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

          {/* Map */}
          <div style={{ marginBottom: 4 }}><SectionHead title="Map" sub="civic issues, county layers & recent permits" /></div>
          <div className="muted" style={{ fontSize: 11, marginBottom: 10, lineHeight: 1.5, maxWidth: 720 }}>
            Use the <strong>Layers</strong> menu (top-right of the map) to overlay one layer at a time — open SeeClickFix issues, county GIS layers, or the most recent permits (geocoded on demand).
          </div>
          <JurisdictionMap muni={muni} permits={permitMarkers} />

          {/* Analytics: category + class */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 26 }}>
            <div>
              <SectionHead title="Permits by type" sub="10-year totals" />
              <div className="card" style={{ padding: 16 }}>
                <BarList rows={dataset.byCategory.map((c) => ({ label: c.category, count: c.count, extra: c.cost ? fmtUSDshort(c.cost) : undefined }))} color={catColor} />
              </div>
            </div>
            <div>
              <SectionHead title="Residential vs. commercial" sub="by property class" />
              <div className="card" style={{ padding: 16 }}>
                <BarList rows={dataset.byClass.map((c) => ({ label: c.klass, count: c.count }))} />
              </div>
              <div style={{ height: 20 }} />
              <SectionHead title="Declared value" sub="cost-of-construction bands" />
              <div className="card" style={{ padding: 16 }}>
                <BarList rows={dataset.valuationBuckets.map((b) => ({ label: b.label, count: b.count }))} />
              </div>
            </div>
          </div>

          {/* Permits over time */}
          <div style={{ marginBottom: 26 }}>
            <SectionHead title="Permits issued over time" sub="by month" />
            <MonthlyChart monthly={dataset.monthly} />
          </div>

          {/* Top contractors */}
          {dataset.topContractors.length > 0 && (
            <div style={{ marginBottom: 26 }}>
              <SectionHead title="Most active contractors" sub="by permit count" />
              <div className="card" style={{ padding: 16 }}>
                <BarList rows={dataset.topContractors.map((c) => ({ label: c.name, count: c.count, extra: c.cost ? fmtUSDshort(c.cost) : undefined }))} />
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ marginBottom: 8 }}><SectionHead title="Recent permit activity" sub={`latest ${Math.min(80, timelineItems.length)} permits issued`} /></div>
          <MeetingTimeline items={timelineItems} emptyText="No recent permits." />
          <MeetingList items={timelineItems} maxHeight={340} emptyText="No recent permits." />

          <div className="muted" style={{ fontSize: 11, marginTop: 18, lineHeight: 1.5 }}>{dataset.source}</div>
        </>
      )}
    </div>
  )
}
