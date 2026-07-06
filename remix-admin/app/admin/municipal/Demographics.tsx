'use client'

import { useEffect, useState } from 'react'
import type { TownDemographics } from '@/lib/municipal/demographics'

function fmtInt(n: number): string {
  return n.toLocaleString('en-US')
}
function fmtUSD0(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
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

export default function Demographics({ muniKey }: { muniKey: string }) {
  const [demo, setDemo] = useState<TownDemographics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/admin/api/municipal/demographics?muni=${encodeURIComponent(muniKey)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setDemo(d.demo || null))
      .catch(() => setDemo(null))
      .finally(() => setLoading(false))
  }, [muniKey])

  if (loading) return <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Loading demographics…</div>
  if (!demo) return null

  const renterPct = Math.max(0, 100 - demo.ownerOccupiedPct)
  const maxBracket = Math.max(...demo.incomeBrackets.map((b) => b.pct), 1)

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Demographics</h2>
        {demo.approximate && (
          <span className="muted" style={{ fontSize: 11 }}>{demo.source}</span>
        )}
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Tile label="Population" value={fmtInt(demo.population)} />
        <Tile label="Households" value={fmtInt(demo.households)} />
        <Tile label="Median income" value={fmtUSD0(demo.medianIncomeUsd)} />
        <Tile label="Median age" value={`${demo.medianAgeYears}`} sub="years" />
        <Tile label="Owner-occupied" value={`${demo.ownerOccupiedPct}%`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Income distribution — single-hue magnitude bars */}
        <div className="card" style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Household income distribution
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {demo.incomeBrackets.map((b) => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 74, fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{b.label}</div>
                <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 5, height: 16, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(b.pct / maxBracket) * 100}%`,
                      background: 'var(--primary)',
                      height: '100%',
                      borderRadius: 5,
                      minWidth: b.pct > 0 ? 4 : 0,
                    }}
                  />
                </div>
                <div style={{ width: 34, fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{b.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Housing tenure — two-category split */}
        <div className="card" style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Housing tenure
          </div>
          <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${demo.ownerOccupiedPct}%`, background: '#3d9c72' }} />
            <div style={{ width: `${renterPct}%`, background: '#5a9bd4' }} />
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 13, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3d9c72', display: 'inline-block' }} />
              Owner {demo.ownerOccupiedPct}%
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#5a9bd4', display: 'inline-block' }} />
              Renter {renterPct}%
            </span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 14 }}>
            {fmtInt(demo.households)} households · {(demo.population / (demo.households || 1)).toFixed(1)} people per household
          </div>
        </div>
      </div>
    </div>
  )
}
