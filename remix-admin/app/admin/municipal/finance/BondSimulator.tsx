'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { NC_TAX_CAP_WATERFALL, NC_HOMEOWNER_TAX_IMPACT } from '@/lib/municipal/budget2026'

function fmtUSDFull(v: number): string {
  return `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`
}
function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`
}

const TERM_OPTIONS = [10, 15, 20, 25, 30]

/** Level-payment bond amortization: the fixed annual payment (principal +
 *  interest) that fully retires `principal` over `years` at annual rate `rate`. */
function annualDebtService(principal: number, rate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0
  if (rate === 0) return principal / years
  return (principal * rate) / (1 - Math.pow(1 + rate, -years))
}

const CURRENT_LEVY = NC_TAX_CAP_WATERFALL[NC_TAX_CAP_WATERFALL.length - 1].value // 2026 Adopted Levy
const MEDIAN_HOME_TAX = NC_HOMEOWNER_TAX_IMPACT.townTaxes2026

const fieldStyle: CSSProperties = {
  width: '100%', fontSize: 13, padding: '5px 10px', borderRadius: 6, boxSizing: 'border-box',
  background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)',
}

/**
 * "Bondable Investment Simulator" — lets a resident model what a hypothetical
 * capital project, financed with a general-obligation bond, would do to the
 * townwide tax levy and to their own Town tax bill. Uses standard
 * level-payment amortization; the levy/homeowner impact is a simplified,
 * clearly-labeled estimate (assumes the new debt service is layered on top
 * of, and shared across taxpayers the same way as, the existing 2026 levy —
 * actual bond structuring and levy allocation may differ project to project).
 */
export function BondSimulator() {
  const [cost, setCost] = useState(5_000_000)
  const [rate, setRate] = useState(4.5)
  const [term, setTerm] = useState(20)

  const result = useMemo(() => {
    const payment = annualDebtService(cost, rate / 100, term)
    const totalPaid = payment * term
    const totalInterest = totalPaid - cost
    const levyImpactPct = CURRENT_LEVY > 0 ? payment / CURRENT_LEVY : 0
    const homeImpact = MEDIAN_HOME_TAX * levyImpactPct
    return { payment, totalPaid, totalInterest, levyImpactPct, homeImpact }
  }, [cost, rate, term])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 18 }}>
        <label style={{ fontSize: 12.5 }}>
          <div className="muted" style={{ marginBottom: 4 }}>Total project cost</div>
          <input
            type="number"
            min={0}
            step={100000}
            value={cost}
            onChange={(e) => setCost(Math.max(0, Number(e.target.value) || 0))}
            aria-label="Total project cost"
            style={fieldStyle}
          />
        </label>
        <label style={{ fontSize: 12.5 }}>
          <div className="muted" style={{ marginBottom: 4 }}>Bond term</div>
          <select value={term} onChange={(e) => setTerm(Number(e.target.value))} aria-label="Bond term" style={fieldStyle}>
            {TERM_OPTIONS.map((t) => <option key={t} value={t}>{t} years</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12.5 }}>
          <div className="muted" style={{ marginBottom: 4 }}>Interest rate (%)</div>
          <input
            type="number"
            min={0}
            max={15}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))}
            aria-label="Interest rate percent"
            style={fieldStyle}
          />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: 14, background: 'var(--panel-2)' }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual debt service</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{fmtUSDFull(result.payment)}</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            {fmtUSDFull(result.totalPaid)} total over {term} years ({fmtUSDFull(result.totalInterest)} interest)
          </div>
        </div>
        <div className="card" style={{ padding: 14, background: 'var(--panel-2)' }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Townwide levy impact</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: '#ca615f' }}>{fmtPct(result.levyImpactPct)}</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>vs. the {fmtUSDFull(CURRENT_LEVY)} 2026 adopted levy</div>
        </div>
        <div className="card" style={{ padding: 14, background: 'var(--panel-2)' }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Median-home impact</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: '#ca615f' }}>+{fmtUSDFull(result.homeImpact)}/yr</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>on a {fmtUSDFull(MEDIAN_HOME_TAX)} Town tax bill</div>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
        Estimate only. Assumes the project is entirely financed with a level-payment general-obligation bond, and
        that the new debt service is layered onto the townwide tax levy and shared across taxpayers the same way
        the existing levy is today. Actual bond structuring, market interest rates, and how a specific project's
        cost is allocated may differ.
      </div>
    </div>
  )
}
