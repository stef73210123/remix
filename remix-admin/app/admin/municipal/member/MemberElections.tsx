'use client'

import { useMemo } from 'react'
import { candidateElectionHistory } from '@/lib/municipal/elections'

const PARTY_ABBR: Record<string, string> = {
  Democratic: 'DEM', Republican: 'REP', Conservative: 'CON',
  'Working Families': 'WFP', Independence: 'IND', Green: 'GRN',
}

function fmtVotes(v: number | null): string {
  return v == null ? '' : v.toLocaleString('en-US')
}

/**
 * A legislator's town-election history (Supervisor / Town Board only), matched
 * by name against the committed election dataset. Renders nothing when the
 * person has no recorded town candidacies, so it's safe to drop on any profile.
 */
export default function MemberElections({ muniKey, name }: { muniKey: string; name: string }) {
  const history = useMemo(() => candidateElectionHistory(muniKey, name), [muniKey, name])
  if (history.length === 0) return null

  return (
    <>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
        Election history
        <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {history.length}</span>
      </h2>
      <div className="card" style={{ padding: 0, marginBottom: 28 }}>
        {history.map(({ race, candidate }, i) => (
          <div
            key={`${race.year}-${race.type}-${race.office}`}
            style={{ padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{race.year}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {race.type === 'general' ? 'General' : 'Primary'} · {race.office}
              </span>
              <span
                className="badge"
                style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                  color: candidate.won ? '#166534' : 'var(--muted)',
                }}
              >
                {candidate.won ? 'Won' : 'Lost'}
              </span>
              {candidate.incumbent && (
                <span className="badge" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Incumbent
                </span>
              )}
              <span style={{ flex: 1 }} />
              {candidate.votes != null && (
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                  {fmtVotes(candidate.votes)} <span className="muted">votes</span>
                </span>
              )}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {candidate.parties.map((p) => PARTY_ABBR[p] ?? p).join(' / ')} line
              {candidate.parties.length > 1 ? 's' : ''}
              {race.seatsUp > 1 ? ` · ${race.seatsUp} seats` : ''}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
