'use client'

import { useMemo, useState } from 'react'
import {
  getElections,
  electionYears,
  type ElectionRace,
  type ElectionCandidate,
} from '@/lib/municipal/elections'
import { fmtDateShort } from '@/lib/municipal/date'

// Ballot-line → accent color for the party pill. Neutral fallback for anything
// unmapped so a new line never breaks the layout.
const PARTY_COLORS: Record<string, string> = {
  Democratic: '#2563d6',
  Republican: '#d0473f',
  Conservative: '#5b74b0',
  'Working Families': '#c76b2a',
  Independence: '#7a8590',
  Green: '#3f9b6b',
}
function partyColor(p: string): string {
  return PARTY_COLORS[p] ?? '#7a8590'
}
function partyAbbr(p: string): string {
  const m: Record<string, string> = {
    Democratic: 'DEM', Republican: 'REP', Conservative: 'CON',
    'Working Families': 'WFP', Independence: 'IND', Green: 'GRN',
  }
  return m[p] ?? p.slice(0, 3).toUpperCase()
}

function fmtVotes(v: number | null): string {
  return v == null ? '—' : v.toLocaleString('en-US')
}

function PartyPills({ parties }: { parties: string[] }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {parties.map((p) => (
        <span
          key={p}
          title={p}
          style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', padding: '1px 6px',
            borderRadius: 4, color: '#fff', background: partyColor(p), whiteSpace: 'nowrap',
          }}
        >
          {partyAbbr(p)}
        </span>
      ))}
    </span>
  )
}

function CandidateRow({ c, max, share }: { c: ElectionCandidate; max: number; share: number | null }) {
  const width = max > 0 && c.votes != null ? Math.max(2, (c.votes / max) * 100) : 0
  return (
    <div style={{ padding: '9px 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ width: 14, flexShrink: 0, color: 'var(--primary)', fontWeight: 700 }}>
          {c.won ? '✓' : ''}
        </span>
        <span style={{ fontWeight: c.won ? 700 : 500, fontSize: 14 }}>{c.name}</span>
        {c.incumbent && (
          <span className="badge" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Incumbent
          </span>
        )}
        <PartyPills parties={c.parties} />
        <span style={{ flex: 1 }} />
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: c.won ? 700 : 500, fontSize: 14 }}>
          {fmtVotes(c.votes)}
        </span>
        {share != null && (
          <span className="muted" style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, width: 46, textAlign: 'right' }}>
            {share.toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ marginLeft: 24, marginTop: 6, height: 6, background: 'var(--panel-2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', borderRadius: 3, background: c.won ? 'var(--primary)' : 'var(--c)' }} />
      </div>
    </div>
  )
}

function RaceBlock({ race }: { race: ElectionRace }) {
  const cands = useMemo(
    () => [...race.candidates].sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1)),
    [race.candidates],
  )
  const max = Math.max(0, ...cands.map((c) => c.votes ?? 0))
  const totalVotes = cands.reduce((s, c) => s + (c.votes ?? 0), 0)
  const hasVotes = cands.some((c) => c.votes != null)
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
        <h4 style={{ fontSize: 14, margin: 0 }}>{race.office}</h4>
        <span className="muted" style={{ fontSize: 12 }}>
          {race.seatsUp > 1 ? `vote for ${race.seatsUp}` : 'one seat'}
        </span>
      </div>
      <div style={{ paddingBottom: 2 }}>
        {cands.map((c) => (
          <CandidateRow
            key={`${c.name}-${c.parties.join('/')}`}
            c={c}
            max={max}
            share={hasVotes && totalVotes > 0 && c.votes != null ? (c.votes / totalVotes) * 100 : null}
          />
        ))}
      </div>
      {race.note && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>{race.note}</div>
      )}
    </div>
  )
}

export default function ElectionResults({ muniKey }: { muniKey: string }) {
  const elections = useMemo(() => getElections(muniKey), [muniKey])
  const years = useMemo(() => electionYears(muniKey), [muniKey])
  const [year, setYear] = useState<number | null>(years[0] ?? null)

  if (!elections || elections.races.length === 0) return null

  const activeYear = year ?? years[0]
  const yearRaces = elections.races.filter((r) => r.year === activeYear)
  const general = yearRaces.filter((r) => r.type === 'general')
  const primary = yearRaces.filter((r) => r.type === 'primary')

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Town elections</h2>
        {years.length > 1 && (
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={y === activeYear ? 'btn' : 'btn secondary'}
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        {/* Primary (June) shown before General (November) — chronological order
            within the election year. */}
        {primary.length > 0 && (
          <>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Primary election{primary[0].date ? ` · ${fmtElectionDate(primary[0].date)}` : ''}
            </div>
            {primary.map((r) => <RaceBlock key={`p-${r.office}`} race={r} />)}
          </>
        )}
        {elections.primaryNote && primary.length === 0 && (
          <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{elections.primaryNote}</div>
        )}
        {general.length > 0 && (
          <>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', margin: primary.length > 0 || elections.primaryNote ? '10px 0 6px' : '0 0 6px' }}>
              General election{general[0].date ? ` · ${fmtElectionDate(general[0].date)}` : ` · November ${activeYear}`}
            </div>
            {general.map((r) => <RaceBlock key={`g-${r.office}`} race={r} />)}
          </>
        )}
        <div className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
          Town offices only (Supervisor &amp; Town Board); county, state and federal races omitted.
          Unofficial results as reported by the Westchester County Board of Elections and local outlets.
        </div>
      </div>
    </div>
  )
}

function fmtElectionDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''))
  if (isNaN(d.getTime())) return iso
  return fmtDateShort(d)
}
