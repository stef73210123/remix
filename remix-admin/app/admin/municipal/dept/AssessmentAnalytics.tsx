'use client'

import { useEffect, useState } from 'react'
import ClearableInput from '@/app/ClearableInput'
import { NC_TOTAL_TAX_LEVY_HISTORY } from '@/lib/municipal/budget2026'

const PARCELS_BASE = 'https://services6.arcgis.com/EbVsqZ18sv1kVJ3k/arcgis/rest/services/Westchester_County_Parcels/FeatureServer/0'
const NC_WHERE = "MUNI_NAME='North Castle'"

// NYS ORPTS property classification system groups every 3-digit class code
// under a first-digit category (210 "Residential — one family" rolls up to
// "200 Residential", etc.) — the service only carries the raw code, not a
// description field, so the group label is derived client-side.
const CLASS_GROUPS: Record<string, string> = {
  '1': 'Agricultural', '2': 'Residential', '3': 'Vacant land', '4': 'Commercial',
  '5': 'Recreation & entertainment', '6': 'Community services', '7': 'Industrial',
  '8': 'Public services', '9': 'Wild, forest & parks',
}
function classGroupLabel(code: string): string {
  const digit = code.trim()[0]
  return (digit && CLASS_GROUPS[digit]) || 'Other/unclassified'
}

// Categorical color assigned by entity identity (fixed order, never cycled,
// never re-derived from sort rank) — 8 validated hues plus one gray fallback
// shared by the two least-common/uncategorized buckets.
const FALLBACK_COLOR = '#8a8f98'
const CLASS_COLORS: Record<string, string> = {
  'Agricultural': '#2a78d6',
  'Residential': '#1baf7a',
  'Vacant land': '#eda100',
  'Commercial': '#008300',
  'Recreation & entertainment': '#4a3aa7',
  'Community services': '#e34948',
  'Industrial': '#e87ba4',
  'Public services': '#eb6834',
  'Wild, forest & parks': FALLBACK_COLOR,
  'Other/unclassified': FALLBACK_COLOR,
}

interface DonutSegment { label: string; value: number; color: string }

/** Reusable inline-SVG donut: rounded track, 2px surface gaps between
 *  segments, a center figure, and a legend with swatch + value + share so
 *  identity is never color-alone. */
function DonutChart({
  segments, size = 148, thickness = 24, centerValue, centerLabel,
}: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerValue: string
  centerLabel: string
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const gap = total > 0 ? 2 : 0
  let offset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={thickness} />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {segments.map((seg) => {
            const frac = total > 0 ? seg.value / total : 0
            const len = frac * circumference
            const dash = Math.max(len - gap, 0)
            const el = (
              <circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              >
                <title>{`${seg.label}: ${fmtUSDFull(seg.value)} (${total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0'}%)`}</title>
              </circle>
            )
            offset += len
            return el
          })}
        </g>
        <text x={cx} y={cy - 5} textAnchor="middle" style={{ fontSize: 15, fontWeight: 700, fill: 'var(--fg)' }}>
          {centerValue}
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" style={{ fontSize: 9.5, fill: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {centerLabel}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, flex: '1 1 160px', minWidth: 140 }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: seg.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--muted)' }}>{seg.label}</span>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {fmtUSD(seg.value)} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0'}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface Summary {
  rollTotal: number
  parcelCount: number
  taxableTotal: number
  exemptTotal: number
}
interface ClassGroupRow { label: string; total: number }

interface AVStats { median: number }

/** Every parcel's TOTAL_AV, ascending — the only way to get an exact median,
 *  since ArcGIS's outStatistics has no median. Paginated (the service caps
 *  records per request well under the town's ~4,800 parcels, so pagination
 *  has to advance by however many rows actually came back and stop on an
 *  empty page, never on "fewer than requested" — that's the normal case
 *  here); each page is just one numeric field, so this stays light. */
async function fetchAssessedValueStats(): Promise<AVStats> {
  const values: number[] = []
  let offset = 0
  for (;;) {
    const url =
      `${PARCELS_BASE}/query?where=${encodeURIComponent(NC_WHERE)}` +
      `&outFields=TOTAL_AV&orderByFields=TOTAL_AV+ASC` +
      `&resultOffset=${offset}&resultRecordCount=2000&returnGeometry=false&f=json`
    const r = await fetch(url)
    if (!r.ok) throw new Error('values')
    const j = (await r.json()) as { features?: { attributes: { TOTAL_AV?: number } }[] }
    const feats = j.features ?? []
    if (feats.length === 0) break
    for (const f of feats) values.push(Number(f.attributes.TOTAL_AV ?? 0))
    offset += feats.length
  }
  if (values.length === 0) return { median: 0 }
  return { median: values[Math.floor(values.length / 2)] }
}

// Per $1,000 of assessed value, 2025-2026 tax year. County and Town rates
// are townwide; School varies by district, since North Castle is split
// across three (a resident's actual bill depends on which one their parcel
// falls in — the ArcGIS service's own SCHOOL_NAME field, not a guess).
// Source: Westchester County Tax Commission's official rate tables —
// 2026 City/Town Tax Rates, 2025 Municipal County Tax Rates (County
// General Levy), and 2025-2026 School District Tax Rates.
const COUNTY_RATE_PER_1000 = 127.268788
const TOWN_RATE_PER_1000 = 181.689369
const SCHOOL_RATE_PER_1000: Record<string, number> = {
  'Byram Hills': 773.388838,
  'Bedford': 747.794426,
  'Valhalla': 957.924050,
}
const TAX_ESTIMATOR_SOURCE_NOTE =
  'Your total is split across County, Town of North Castle, and School District (Byram Hills/Bedford/Valhalla, the three districts serving North Castle) proportional to each one’s share of the combined 2025-2026 tax rate per $1,000 of assessed value. Source: Westchester County Tax Commission. Estimate only: excludes special districts (fire, water, sewer, lighting, ambulance) that apply to some parcels but not others, and rates are set annually.'

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2)}M`
  if (v >= 1_000) return `$${Math.round(v / 1000)}K`
  return `$${Math.round(v)}`
}
function fmtUSDFull(v: number): string {
  return `$${Math.round(v).toLocaleString('en-US')}`
}

const LEVY_SOURCE_NOTE =
  'Total town-wide tax levy — general town, highway, fire protection, and dependent special districts (lighting/sewer/water), net of sales-tax credits. Excludes the county levy, independent fire districts, and school levies, which are set separately. Source: NYS Comptroller’s Real Property Tax Levies dataset (FY2020-2024) and the Town’s own tax-cap-law worksheet (FY2025-2026, including the 2026 voted override above the state cap).'

/** A diverging (increase/decrease) horizontal bar per year, centered on a
 *  zero baseline — orange/blue rather than red/green so it doesn't read as
 *  "bad/good," just up/down, and stays distinguishable for color-blind
 *  readers. Bar length is relative to the largest |change| in the window, so
 *  a real standout (the 2026 cap override) reads as a real standout. */
function LevyChangeChart({ rows }: { rows: { year: number; pct: number }[] }) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.pct)), 0.01)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => {
        const halfWidthPct = (Math.abs(r.pct) / maxAbs) * 50
        const positive = r.pct >= 0
        return (
          <div key={r.year} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 34, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{r.year}</span>
            <div style={{ flex: 1, position: 'relative', height: 18, background: 'var(--panel-2)', borderRadius: 4 }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
              <div
                style={{
                  position: 'absolute', top: 2, bottom: 2,
                  left: positive ? '50%' : `${50 - halfWidthPct}%`,
                  width: `${halfWidthPct}%`,
                  background: positive ? '#eb6834' : '#2a78d6',
                  borderRadius: 3,
                }}
              />
            </div>
            <span
              style={{
                width: 58, textAlign: 'right', fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: positive ? '#eb6834' : '#2a78d6',
              }}
            >
              {positive ? '+' : ''}{r.pct.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Total tax levy, year-over-year % change — the last 5 fiscal years. A
 *  separate question from the tax estimator above it (what the whole levy
 *  did year to year, not what one parcel would owe), and from static,
 *  already-verified figures (NC_TOTAL_TAX_LEVY_HISTORY) rather than a live
 *  query, since no live-queryable source publishes this figure. */
function LevyChangeWidget() {
  const rows = NC_TOTAL_TAX_LEVY_HISTORY
    .slice(1)
    .map((y, i) => ({ year: y.year, pct: ((y.levy - NC_TOTAL_TAX_LEVY_HISTORY[i].levy) / NC_TOTAL_TAX_LEVY_HISTORY[i].levy) * 100 }))
    .slice(-5)

  return (
    <div>
      <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
        Total tax levy, year-over-year % change
      </div>
      <LevyChangeChart rows={rows} />
      <div className="muted" style={{ fontSize: 10.5, marginTop: 14, lineHeight: 1.5 }}>{LEVY_SOURCE_NOTE}</div>
    </div>
  )
}

/** Analytics widgets for the Assessment roll: total assessed value grouped by
 *  NYS property-class category, the taxable-vs-exempt split, and a handful of
 *  headline stats — complements the parcel/owner list above with the
 *  town-wide shape of the roll instead of a row-level view of it. */
export default function AssessmentAnalytics() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [classGroups, setClassGroups] = useState<ClassGroupRow[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [avStats, setAvStats] = useState<AVStats | null>(null)
  const [selectedTax, setSelectedTax] = useState<number | null>(null)
  const [taxInput, setTaxInput] = useState('')
  const [district, setDistrict] = useState<keyof typeof SCHOOL_RATE_PER_1000>('Byram Hills')

  useEffect(() => {
    let cancelled = false
    fetchAssessedValueStats()
      .then((s) => {
        if (cancelled) return
        setAvStats(s)
        // Seed the box with what the median-assessed home would owe (at the
        // default district's rate) — a realistic starting point, not zero.
        const totalRate = COUNTY_RATE_PER_1000 + TOWN_RATE_PER_1000 + SCHOOL_RATE_PER_1000['Byram Hills']
        const seedTax = Math.round((s.median / 1000) * totalRate)
        setSelectedTax(seedTax)
        setTaxInput(seedTax.toLocaleString('en-US'))
      })
      .catch(() => { /* median stat tile / estimator just won't render */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    const rollP = fetch(
      `${PARCELS_BASE}/query?where=${encodeURIComponent(NC_WHERE)}` +
      `&outStatistics=${encodeURIComponent(JSON.stringify([
        { statisticType: 'sum', onStatisticField: 'TOTAL_AV', outStatisticFieldName: 'total' },
        { statisticType: 'count', onStatisticField: 'OBJECTID', outStatisticFieldName: 'cnt' },
      ]))}&f=json`,
    ).then((r) => (r.ok ? r.json() : Promise.reject(new Error('roll'))))

    // ROLL_SECTION '1' is the standard NYS taxable roll section; every other
    // section (special franchise, wholly exempt, …) is non-taxable.
    const rollSectionP = fetch(
      `${PARCELS_BASE}/query?where=${encodeURIComponent(NC_WHERE)}` +
      `&groupByFieldsForStatistics=ROLL_SECTION` +
      `&outStatistics=${encodeURIComponent(JSON.stringify([{ statisticType: 'sum', onStatisticField: 'TOTAL_AV', outStatisticFieldName: 'total' }]))}&f=json`,
    ).then((r) => (r.ok ? r.json() : Promise.reject(new Error('roll section'))))

    const classP = fetch(
      `${PARCELS_BASE}/query?where=${encodeURIComponent(NC_WHERE)}` +
      `&groupByFieldsForStatistics=PROP_CLASS` +
      `&outStatistics=${encodeURIComponent(JSON.stringify([{ statisticType: 'sum', onStatisticField: 'TOTAL_AV', outStatisticFieldName: 'total' }]))}&f=json`,
    ).then((r) => (r.ok ? r.json() : Promise.reject(new Error('class'))))

    Promise.all([rollP, rollSectionP, classP])
      .then(([roll, rollSection, cls]: [
        { features?: { attributes: { total?: number; cnt?: number } }[] },
        { features?: { attributes: { ROLL_SECTION?: string | null; total?: number } }[] },
        { features?: { attributes: { PROP_CLASS?: string | null; total?: number } }[] },
      ]) => {
        if (cancelled) return
        const rollTotal = roll.features?.[0]?.attributes.total ?? 0
        const parcelCount = roll.features?.[0]?.attributes.cnt ?? 0

        let taxableTotal = 0
        let exemptTotal = 0
        for (const f of rollSection.features ?? []) {
          const v = f.attributes.total ?? 0
          if (f.attributes.ROLL_SECTION === '1') taxableTotal += v
          else exemptTotal += v
        }

        const byGroup = new Map<string, number>()
        for (const f of cls.features ?? []) {
          const code = f.attributes.PROP_CLASS
          if (!code) continue
          const label = classGroupLabel(code)
          byGroup.set(label, (byGroup.get(label) ?? 0) + (f.attributes.total ?? 0))
        }
        const groups = Array.from(byGroup.entries())
          .map(([label, total]) => ({ label, total }))
          .sort((a, b) => b.total - a.total)

        setSummary({ rollTotal, parcelCount, taxableTotal, exemptTotal })
        setClassGroups(groups)
        setStatus('ok')
      })
      .catch(() => { if (!cancelled) setStatus('error') })

    return () => { cancelled = true }
  }, [])

  if (status === 'error') {
    return <div className="muted" style={{ padding: 20, fontSize: 12.5, textAlign: 'center' }}>Unable to load assessment analytics right now.</div>
  }
  if (status === 'loading' || !summary || !classGroups) {
    return <div className="muted" style={{ padding: 20, fontSize: 12.5, textAlign: 'center' }}>Loading…</div>
  }

  const taxablePct = summary.rollTotal > 0 ? (summary.taxableTotal / summary.rollTotal) * 100 : 0
  // The typed number IS the total tax bill — split into the three components
  // by each jurisdiction's share of the combined rate, so they always sum
  // back to exactly what was typed (never a different, confusing total).
  const totalTax = selectedTax ?? 0
  const combinedRate = COUNTY_RATE_PER_1000 + TOWN_RATE_PER_1000 + SCHOOL_RATE_PER_1000[district]
  const countyTax = totalTax * (COUNTY_RATE_PER_1000 / combinedRate)
  const townTax = totalTax * (TOWN_RATE_PER_1000 / combinedRate)
  const schoolTax = totalTax * (SCHOOL_RATE_PER_1000[district] / combinedRate)

  function onTaxInputChange(text: string) {
    const digits = text.replace(/[^0-9]/g, '')
    const n = digits === '' ? 0 : Number(digits)
    setTaxInput(digits === '' ? '' : n.toLocaleString('en-US'))
    setSelectedTax(n)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: 14, flex: '1 1 160px' }}>
          <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total assessed value</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 3 }}>{fmtUSDFull(summary.rollTotal)}</div>
        </div>
        <div className="card" style={{ padding: 14, flex: '1 1 160px' }}>
          <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parcels</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 3 }}>{summary.parcelCount.toLocaleString()}</div>
        </div>
        <div className="card" style={{ padding: 14, flex: '1 1 160px' }}>
          <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Median assessed value</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 3 }}>{avStats ? fmtUSDFull(avStats.median) : '—'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: 16, flex: '2 1 420px', minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Assessed value by property type
          </div>
          <DonutChart
            segments={classGroups.map((g) => ({ label: g.label, value: g.total, color: CLASS_COLORS[g.label] ?? FALLBACK_COLOR }))}
            centerValue={fmtUSD(summary.rollTotal)}
            centerLabel="Total assessed"
          />
        </div>

        <div className="card" style={{ padding: 16, flex: '1 1 300px', minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Taxable vs. exempt
          </div>
          <DonutChart
            segments={[
              { label: 'Taxable', value: summary.taxableTotal, color: '#2a78d6' },
              { label: 'Exempt/other', value: summary.exemptTotal, color: FALLBACK_COLOR },
            ]}
            centerValue={`${taxablePct.toFixed(1)}%`}
            centerLabel="Taxable"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {avStats && (
          <div className="card" style={{ padding: 16, flex: '1 1 420px', minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Tax assessment breakdown
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>
              Type a total annual tax bill to see how it splits across County, Town, and School.
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="muted" style={{ fontSize: 13 }}>$</span>
                <ClearableInput
                  type="text"
                  inputMode="numeric"
                  value={taxInput}
                  onChange={onTaxInputChange}
                  className="input"
                  wrapperStyle={{ width: 128 }}
                  style={{ fontSize: 12.5, padding: '5px 8px' }}
                  aria-label="Annual tax bill"
                />
              </div>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value as keyof typeof SCHOOL_RATE_PER_1000)}
                aria-label="School district"
                style={{ fontSize: 12.5, padding: '5px 9px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                {Object.keys(SCHOOL_RATE_PER_1000).map((d) => (
                  <option key={d} value={d}>{d} schools</option>
                ))}
              </select>
            </div>
            <DonutChart
              segments={[
                { label: 'County', value: countyTax, color: '#2a78d6' },
                { label: 'Town', value: townTax, color: '#1baf7a' },
                { label: 'School', value: schoolTax, color: '#4a3aa7' },
              ]}
              centerValue={fmtUSDFull(totalTax)}
              centerLabel="Est. total taxes"
            />
            <div className="muted" style={{ fontSize: 10.5, marginTop: 14, lineHeight: 1.5 }}>{TAX_ESTIMATOR_SOURCE_NOTE}</div>
          </div>
        )}

        <div className="card" style={{ padding: 16, flex: '1 1 420px', minWidth: 0 }}>
          <LevyChangeWidget />
        </div>
      </div>
    </div>
  )
}
