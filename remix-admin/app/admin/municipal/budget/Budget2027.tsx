'use client'

import {
  NC_2027_BUDGET_CYCLE as CYCLE,
  NC_2027_TAX_CAP_WATERFALL,
  NC_2027_LEVY as LEVY,
  NC_2027_HOMEOWNER_IMPACT as HOME,
  NC_2027_MAJOR_FUNDS,
  NC_2027_OVERRIDE_REASONS,
  NC_2027_CONTEXT,
  NC_2027_SOURCE_NOTE,
} from '@/lib/municipal/budget2027'
import { LevyWaterfallChart } from '../dept/AssessmentAnalytics'
import { HelpToggle, HelpPanel, useHelpToggle } from '../HelpToggle'

const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`
const usdM = (v: number) => `$${(v / 1_000_000).toFixed(1)}M`
const pct = (a: number, b: number) => ((b - a) / a) * 100
const signed = (v: number, digits = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}%`

function fmtDay(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const STATUS_LABEL: Record<typeof CYCLE.status, string> = {
  tentative: 'Tentative',
  preliminary: 'Proposed',
  adopted: 'Adopted',
}

function statusLine(): string {
  if (CYCLE.status === 'adopted') {
    return `Adopted ${CYCLE.adoptedOn ? fmtDay(CYCLE.adoptedOn) : ''}${CYCLE.adoptionVote ? ` · vote ${CYCLE.adoptionVote}` : ''}`
  }
  const hearingPast = new Date(CYCLE.hearingOn + 'T23:59:59') < new Date()
  return hearingPast
    ? `Public hearing held ${fmtDay(CYCLE.hearingOn)} · Board must adopt by ${fmtDay(CYCLE.adoptBy)}`
    : `Public hearing ${fmtDay(CYCLE.hearingOn)} · Board must adopt by ${fmtDay(CYCLE.adoptBy)}`
}

function StatusPill() {
  const adopted = CYCLE.status === 'adopted'
  return (
    <span
      style={{
        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        padding: '2px 8px', borderRadius: 999,
        background: adopted ? 'rgba(31,122,77,0.12)' : 'rgba(199,107,42,0.14)',
        color: adopted ? '#1f7a4d' : '#a85413',
      }}
    >
      {STATUS_LABEL[CYCLE.status]}
    </span>
  )
}

function Kpi({ value, label, tone }: { value: string; label: React.ReactNode; tone?: 'up' }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: tone === 'up' ? '#c0201d' : undefined, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 3, lineHeight: 1.35 }}>{label}</div>
    </div>
  )
}

function Headline() {
  const levyPct = pct(LEVY.prior, LEVY.proposed)
  return (
    <div className="budget-kpis">
      <Kpi value={usdM(LEVY.proposed)} label={<>proposed town tax levy ({signed(levyPct)} vs. 2026)</>} tone="up" />
      <Kpi value={usdM(LEVY.overCap)} label="over the state tax cap — needs a 60% Board vote" />
      <Kpi value={`+${usd(HOME.increase)}/yr`} label={<>town tax on a median {usdM(HOME.medianHomeValue)} home ({usd(HOME.townTaxesPrior)} → {usd(HOME.townTaxesProposed)})</>} />
    </div>
  )
}

/** Compact card for the dashboard — links through to Finance for the detail. */
export function BudgetSnapshot({ muni }: { muni: string }) {
  return (
    <div id="sec-budget" style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>{CYCLE.fiscalYear} town budget</h2>
        <StatusPill />
      </div>
      <a href={`/admin/municipal/finance?muni=${muni}#budget-${CYCLE.fiscalYear}`} className="card budget-snapshot" style={{ display: 'block', padding: 16, color: 'inherit', textDecoration: 'none' }}>
        <Headline />
        <div className="muted" style={{ fontSize: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span>{statusLine()}</span>
          <span style={{ color: 'var(--primary-light)', textDecoration: 'underline' }}>Full budget breakdown →</span>
        </div>
      </a>
    </div>
  )
}

/** Full section for the Finance page. */
export default function Budget2027() {
  const help = useHelpToggle()
  return (
    <section id={`budget-${CYCLE.fiscalYear}`} style={{ marginBottom: 30, scrollMarginTop: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>{CYCLE.fiscalYear} Budget</h2>
        <StatusPill />
        <HelpToggle {...help} label="About the 2027 budget figures" />
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>{statusLine()}</div>
      <HelpPanel open={help.open} id={help.id}>
        {NC_2027_SOURCE_NOTE}{' '}
        <a href={CYCLE.packetUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'underline' }}>
          Read the budget packet (PDF) ↗
        </a>
      </HelpPanel>

      {CYCLE.status !== 'adopted' && (
        <div className="budget-callout">
          These are the <strong>proposed</strong> numbers the Town Board took to public hearing. They can change before adoption.
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <Headline />
        <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 14 }}>
          <strong>Why it&apos;s going up, per the Town:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {NC_2027_OVERRIDE_REASONS.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 10 }}>{NC_2027_CONTEXT}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 16, minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            How the levy builds past the cap
          </div>
          <LevyWaterfallChart steps={NC_2027_TAX_CAP_WATERFALL} overrideVoted={CYCLE.overridePassed === true} />
        </div>

        <div className="card" style={{ padding: 16, minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Major funds · 2026 → 2027 request
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {NC_2027_MAJOR_FUNDS.map((f) => {
              const ap = pct(f.appropriation2026, f.appropriation2027)
              const lv = pct(f.levy2026, f.levy2027)
              return (
                <div key={f.code} style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 14 }}>{f.fund}</strong>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{usdM(f.appropriation2027)} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{signed(ap)}</span></span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>
                    Tax levy {usdM(f.levy2026)} → {usdM(f.levy2027)} ({signed(lv)}) · reserves used {f.fundBalance2026 ? usdM(f.fundBalance2026) : '$0'} → {usdM(f.fundBalance2027)}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
            From the Oct 16 line-item request; fund totals may shift in the final budget.
          </div>
        </div>
      </div>
    </section>
  )
}
