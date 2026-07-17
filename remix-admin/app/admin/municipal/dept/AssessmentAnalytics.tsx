'use client'

import { useEffect, useState } from 'react'

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

interface Summary {
  rollTotal: number
  parcelCount: number
  taxableTotal: number
  exemptTotal: number
}
interface ClassGroupRow { label: string; total: number }

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2)}M`
  if (v >= 1_000) return `$${Math.round(v / 1000)}K`
  return `$${Math.round(v)}`
}
function fmtUSDFull(v: number): string {
  return `$${Math.round(v).toLocaleString('en-US')}`
}

/** Analytics widgets for the Assessment roll: total assessed value grouped by
 *  NYS property-class category, the taxable-vs-exempt split, and a handful of
 *  headline stats — complements the parcel/owner list above with the
 *  town-wide shape of the roll instead of a row-level view of it. */
export default function AssessmentAnalytics() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [classGroups, setClassGroups] = useState<ClassGroupRow[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

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

  const maxGroupTotal = Math.max(...classGroups.map((g) => g.total), 1)
  const taxablePct = summary.rollTotal > 0 ? (summary.taxableTotal / summary.rollTotal) * 100 : 0
  const exemptPct = 100 - taxablePct
  const avgAssessed = summary.parcelCount > 0 ? summary.rollTotal / summary.parcelCount : 0

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
          <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average assessed value</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 3 }}>{fmtUSDFull(avgAssessed)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: 16, flex: '2 1 380px', minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Assessed value by property type
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {classGroups.map((g) => (
              <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 150, fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{g.label}</div>
                <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 5, height: 16, overflow: 'hidden' }}>
                  <div style={{ width: `${(g.total / maxGroupTotal) * 100}%`, background: '#f59e0b', height: '100%', borderRadius: 5, minWidth: g.total > 0 ? 4 : 0 }} />
                </div>
                <div style={{ width: 68, fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtUSD(g.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 16, flex: '1 1 220px', minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Taxable vs. exempt
          </div>
          <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${taxablePct}%`, background: '#3d9c72' }} />
            <div style={{ width: `${exemptPct}%`, background: '#5a9bd4' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3d9c72', display: 'inline-block', flexShrink: 0 }} />
              Taxable — {fmtUSD(summary.taxableTotal)} ({taxablePct.toFixed(1)}%)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#5a9bd4', display: 'inline-block', flexShrink: 0 }} />
              Exempt/other — {fmtUSD(summary.exemptTotal)} ({exemptPct.toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
