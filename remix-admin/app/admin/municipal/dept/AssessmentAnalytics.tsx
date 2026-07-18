'use client'

import { useEffect, useState } from 'react'
import ClearableInput from '@/app/ClearableInput'
import { NC_TAX_CAP_WATERFALL, NC_HOMEOWNER_TAX_IMPACT, type WaterfallStep } from '@/lib/municipal/budget2026'

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

const LEVY_WATERFALL_SOURCE_NOTE =
  'Source: Town of North Castle 2026 Adopted Budget — the tax-cap-law worksheet (General Municipal Law §3-c) and homeowner-impact analysis prepared by the Finance Department. "Override" reflects the Town Board’s vote to adopt a levy above the state-calculated cap.'

interface WaterfallRow extends WaterfallStep {
  barStart: number
  barEnd: number
  isCheckpoint: boolean
  /** % change vs. the value immediately behind this step (a delta's own
   *  size relative to the running total before it; a checkpoint's
   *  cumulative change from the walk's starting checkpoint). Null for the
   *  very first row, which has no prior value to compare against. */
  pctChange: number | null
}

/** A 'benchmark' step doesn't get a bar row of its own — it's drawn as a
 *  vertical reference line across the whole chart instead (see
 *  BENCHMARK_COLOR below). pctChange is always vs. the walk's starting
 *  checkpoint, matching the checkpoint rows' convention. */
interface BenchmarkMarker {
  label: string
  value: number
  pctChange: number | null
}

const BENCHMARK_COLOR = '#c9424a'

function fmtPct(pct: number): string {
  return `${pct >= 0 ? '+' : '-'}${Math.abs(pct).toFixed(1)}%`
}

/** Rounds a raw axis-padding amount up to a "nice" 1/2/5×10^n step, so a
 *  zoomed domain lands on clean numbers instead of an arbitrary-looking crop. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const residual = raw / magnitude
  const mult = residual < 1.5 ? 1 : residual < 3.5 ? 2 : residual < 7.5 ? 5 : 10
  return mult * magnitude
}

/** The two remaining bar checkpoints (the FYE levy and the adopted levy)
 *  sit within ~6% of each other — and every step in between is smaller
 *  still. Scaling bars from $0 makes them look nearly identical and shrinks
 *  every delta to an illegible sliver (some below a pixel). A bridge/
 *  waterfall chart's job is to show the shape of a walk from a start value
 *  to an end value, not to compare that walk to zero — every real bridge-
 *  chart tool (Excel, Tableau, PowerBI) auto-scales this same way — so the
 *  axis is zoomed to the walk's own range instead, with ~12% padding
 *  rounded to a clean step. The chart discloses this (it isn't a $0
 *  baseline) via the axis labels and caption below it. A 'benchmark' step
 *  doesn't add to the running total (it's a reference line, not a levied
 *  amount or a contribution) — its waypoint is wherever the walk already is. */
function waterfallDomain(steps: WaterfallStep[]): [number, number] {
  let running = 0
  const waypoints = steps.map((s) => {
    if (s.kind === 'total') running = s.value
    else if (s.kind === 'delta') running += s.value
    return running
  })
  const rawMin = Math.min(...waypoints)
  const rawMax = Math.max(...waypoints)
  const pad = Math.max((rawMax - rawMin) * 0.12, 1)
  const step = niceStep(pad)
  return [Math.floor((rawMin - pad) / step) * step, Math.ceil((rawMax + pad) / step) * step]
}

/** Turns the raw {label, value, kind} steps into bar spans, against the
 *  zoomed domain above rather than absolute zero, plus a separate list of
 *  benchmark markers (no bar, no effect on the running total — see
 *  waterfallDomain above): a 'total' step is a checkpoint bar running from
 *  the domain's left edge to its value (so its length is comparable to the
 *  other checkpoint and to the deltas); a 'delta' step floats from the
 *  running total left by the previous step to the new one, in whichever
 *  direction it moves. */
function toWaterfallRows(steps: WaterfallStep[], domainMin: number): { rows: WaterfallRow[]; benchmarks: BenchmarkMarker[] } {
  let running = 0
  const baseValue = steps.find((s) => s.kind === 'total')?.value ?? 0
  const rows: WaterfallRow[] = []
  const benchmarks: BenchmarkMarker[] = []
  for (const s of steps) {
    if (s.kind === 'total') {
      const pctChange = rows.length === 0 ? null : ((s.value - baseValue) / baseValue) * 100
      running = s.value
      rows.push({ ...s, barStart: domainMin, barEnd: s.value, isCheckpoint: true, pctChange })
    } else if (s.kind === 'delta') {
      const start = running
      running += s.value
      const pctChange = start !== 0 ? (s.value / start) * 100 : null
      rows.push({ ...s, barStart: Math.min(start, running), barEnd: Math.max(start, running), isCheckpoint: false, pctChange })
    } else {
      benchmarks.push({ label: s.label, value: s.value, pctChange: baseValue !== 0 ? ((s.value - baseValue) / baseValue) * 100 : null })
    }
  }
  return { rows, benchmarks }
}

// The row layout below is label(128) + gap(8) + track(flex) + gap(8) + value(118) —
// fixed on both sides of the flexible track, so a benchmark line's horizontal
// position within the track can be placed with plain CSS calc() against these
// same constants rather than measuring the DOM.
const ROW_LABEL_W = 128
const ROW_VALUE_W = 118
const ROW_SIDE_W = ROW_LABEL_W + 8 + 8 + ROW_VALUE_W

/** Horizontal bridge/waterfall: checkpoints (the starting and adopted levy)
 *  get a solid bar from the zoomed axis's left edge; each step in between
 *  floats a bar spanning just its own contribution — so the chart reads
 *  left-to-right as the actual arithmetic behind the final number, not a
 *  single opaque percentage, and (thanks to the zoomed domain) every step's
 *  bar length is actually legible instead of the checkpoints swallowing the
 *  whole track. The state-calculated Tax Levy Limit isn't a levied amount
 *  the walk passes through like the others — it's a threshold — so it's
 *  drawn as a dashed vertical line across every row instead of a bar of its
 *  own; the "Override" bar right after it visibly starts exactly where the
 *  line sits, showing the override for what it is. Orange/blue (not red/
 *  green) for increase/decrease, consistent with the rest of this page;
 *  checkpoints get a third, distinct color, and the benchmark line a
 *  fourth, since they're each a different kind of thing. */
function LevyWaterfallChart({ steps }: { steps: WaterfallStep[] }) {
  const [domainMin, domainMax] = waterfallDomain(steps)
  const domainSpan = domainMax - domainMin
  const { rows, benchmarks } = toWaterfallRows(steps, domainMin)
  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontSize: 11.5, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: '#4a3aa7', display: 'inline-block' }} /> Checkpoint
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: '#eb6834', display: 'inline-block' }} /> Adds to the levy
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: '#2a78d6', display: 'inline-block' }} /> Reduces the levy
        </span>
        {benchmarks.map((b) => (
          <span key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 0, borderTop: `2px dashed ${BENCHMARK_COLOR}`, display: 'inline-block' }} /> {b.label} (state cap)
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', paddingTop: 16 }}>
        {benchmarks.map((b) => {
          const fraction = Math.min(1, Math.max(0, (b.value - domainMin) / domainSpan))
          const left = `calc(${ROW_LABEL_W + 8}px + (100% - ${ROW_SIDE_W}px) * ${fraction})`
          return (
            <div key={b.label}>
              <div
                style={{
                  position: 'absolute', top: 16, bottom: 0, left, width: 0,
                  borderLeft: `2px dashed ${BENCHMARK_COLOR}`, pointerEvents: 'none',
                }}
                title={`${b.label}: ${fmtUSDFull(b.value)}${b.pctChange != null ? ` (${fmtPct(b.pctChange)} vs. the starting levy)` : ''}`}
              />
              <div
                style={{
                  position: 'absolute', top: 0, left, transform: 'translateX(-50%)',
                  fontSize: 9, fontWeight: 700, color: BENCHMARK_COLOR, whiteSpace: 'nowrap',
                }}
              >
                Cap: {fmtUSD(b.value)}
              </div>
            </div>
          )
        })}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rows.map((r) => {
            const startPct = ((r.barStart - domainMin) / domainSpan) * 100
            const widthPct = Math.max(((r.barEnd - r.barStart) / domainSpan) * 100, 0.6)
            const color = r.isCheckpoint ? '#4a3aa7' : r.value >= 0 ? '#eb6834' : '#2a78d6'
            const dollarText = r.isCheckpoint ? fmtUSDFull(r.value) : `${r.value >= 0 ? '+' : '-'}${fmtUSDFull(Math.abs(r.value))}`
            const pctColor = r.pctChange != null && r.pctChange < 0 ? '#2a78d6' : '#eb6834'
            return (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: ROW_LABEL_W, flexShrink: 0, fontSize: 10.5, lineHeight: 1.25, color: 'var(--muted)' }}>{r.label}</span>
                <div style={{ flex: 1, position: 'relative', height: 15, background: 'var(--panel-2)', borderRadius: 3, minWidth: 0 }}>
                  <div
                    style={{
                      position: 'absolute', left: `${startPct}%`, width: `${widthPct}%`, top: 1, bottom: 1,
                      background: color, borderRadius: 2,
                    }}
                    title={`${r.label}: ${dollarText}${r.pctChange != null ? ` (${fmtPct(r.pctChange)})` : ''}`}
                  />
                </div>
                <span style={{ width: ROW_VALUE_W, textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{dollarText}</span>
                  {r.pctChange != null && (
                    <span style={{ fontSize: 9.5, fontWeight: 600, marginLeft: 5, color: pctColor, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtPct(r.pctChange)}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      {/* Axis bounds, so the zoomed (non-zero) scale is disclosed rather than implied. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ width: ROW_LABEL_W, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
          <span>{fmtUSD(domainMin)}</span>
          <span>{fmtUSD(domainMax)}</span>
        </div>
        <span style={{ width: ROW_VALUE_W, flexShrink: 0 }} />
      </div>
      <div className="muted" style={{ fontSize: 10.5, marginTop: 6, lineHeight: 1.4 }}>
        Bars are scaled to {fmtUSD(domainMin)}–{fmtUSD(domainMax)}, not from $0, so each step in the walk is visible. The dashed line marks the state-calculated Tax Levy Limit the Town Board voted to override.
      </div>
    </div>
  )
}

/** "Why the levy changed" — replaces a single YoY % (which flattens tax-base
 *  growth, PILOTs, the 2% state cap, exclusions, and the 2026 voted override
 *  into one misleading number) with the actual build-up, plus what it means
 *  in dollars for a typical homeowner. Both figures are already-committed,
 *  already-verified constants (NC_TAX_CAP_WATERFALL, NC_HOMEOWNER_TAX_IMPACT)
 *  — this is their first time being charted anywhere on the site. */
function LevyWaterfallWidget() {
  return (
    <div>
      <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
        Why the 2026 levy changed
      </div>
      <LevyWaterfallChart steps={NC_TAX_CAP_WATERFALL} />
      <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: 'var(--panel-2)', fontSize: 12.5, lineHeight: 1.5 }}>
        For North Castle’s median-value home ({fmtUSD(NC_HOMEOWNER_TAX_IMPACT.medianHomeValue)}), this means Town taxes go from{' '}
        <strong>{fmtUSDFull(NC_HOMEOWNER_TAX_IMPACT.townTaxes2025)}</strong> to{' '}
        <strong>{fmtUSDFull(NC_HOMEOWNER_TAX_IMPACT.townTaxes2026)}</strong>{' '}
        ({NC_HOMEOWNER_TAX_IMPACT.increase >= 0 ? '+' : ''}{fmtUSDFull(NC_HOMEOWNER_TAX_IMPACT.increase)},{' '}
        {NC_HOMEOWNER_TAX_IMPACT.increasePct >= 0 ? '+' : ''}{(NC_HOMEOWNER_TAX_IMPACT.increasePct * 100).toFixed(1)}%).
      </div>
      <div className="muted" style={{ fontSize: 10.5, marginTop: 14, lineHeight: 1.5 }}>{LEVY_WATERFALL_SOURCE_NOTE}</div>
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
          <LevyWaterfallWidget />
        </div>
      </div>
    </div>
  )
}
