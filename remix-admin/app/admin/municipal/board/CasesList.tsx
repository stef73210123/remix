'use client'

import { useMemo, useState } from 'react'
import type { AnalysisDataset, CaseRollup, MemberProfile } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent, dispositionLabel } from '../sentiment'
import { propertyId } from '@/lib/municipal/propertyId'
import { fmtDateShort as fmtDateCompact } from '@/lib/municipal/date'

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''))
  if (isNaN(d.getTime())) return iso
  return fmtDateCompact(d)
}

function Chip({ score }: { score: number }) {
  return (
    <span style={sentimentChipStyle(score)} title={`${dispositionLabel(score)} — how the board's recorded discussion read, not a decision`}>
      {fmtSent(score)}
    </span>
  )
}

function ThemeTag({ t }: { t: string }) {
  return <span className="badge" style={{ fontSize: 11 }}>{t}</span>
}

/** Tiny sentiment trajectory sparkline (points over time). */
function Spark({ points, w = 88, h = 22 }: { points: number[]; w?: number; h?: number }) {
  if (points.length === 0) return null
  const n = points.length
  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w)
  const y = (v: number) => h / 2 - (Math.max(-1, Math.min(1, v)) * (h / 2 - 2))
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden>
      <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="var(--border)" strokeWidth={1} />
      {n > 1 && <path d={d} fill="none" stroke="var(--muted)" strokeWidth={1.5} />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p)} r={2.5} fill={sentimentColor(p)} />
      ))}
    </svg>
  )
}

/** Last date a case was seen (its latest timeline appearance). */
function lastSeen(c: CaseRollup): string {
  let max = ''
  for (const ap of c.timeline) if (ap.date > max) max = ap.date
  return max
}

type CaseSort = 'lastSeen' | 'name'

/**
 * Recurring/all applications (or agenda items, for the Town Board) table —
 * search, sort, and a bounded-height scroll window. Rendered by the host page
 * after the Meetings section, using the AnalysisDataset TranscriptAnalysis
 * surfaced via its onData callback.
 */
export default function CasesList({ data, muni }: { data: AnalysisDataset; muni: string }) {
  const [showAllCases, setShowAllCases] = useState(false)
  const [openCase, setOpenCase] = useState<string | null>(null)
  const [caseSort, setCaseSort] = useState<CaseSort>('lastSeen')
  const [caseQuery, setCaseQuery] = useState('')

  const isTownBoard = data.meta.bodyKey === 'town_board'
  const itemNounPlural = isTownBoard ? 'agenda items' : 'applications'
  const itemNounTitle = itemNounPlural

  const byName = (a: CaseRollup, b: CaseRollup) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  const byLastSeen = (a: CaseRollup, b: CaseRollup) => lastSeen(b).localeCompare(lastSeen(a))

  const trackedCases = useMemo(
    () => data.cases.filter((c) => c.appearances >= 2),
    [data]
  )
  const visibleCases = useMemo(() => {
    const base = showAllCases ? [...data.cases] : [...trackedCases]
    const q = caseQuery.trim().toLowerCase()
    const filtered = q
      ? base.filter((c) =>
          [c.name, c.address, c.applicant, c.applicationType, ...(c.themes || [])]
            .filter(Boolean)
            .some((s) => String(s).toLowerCase().includes(q)),
        )
      : base
    return filtered.sort(caseSort === 'name' ? byName : byLastSeen)
  }, [showAllCases, data, trackedCases, caseQuery, caseSort])

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h3 style={{ fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          {showAllCases ? `All ${itemNounTitle} (${visibleCases.length})` : `Recurring ${itemNounTitle} (${visibleCases.length})`}
        </h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            value={caseQuery}
            onChange={(e) => setCaseQuery(e.target.value)}
            placeholder={`Search ${itemNounPlural}…`}
            aria-label={`Search ${itemNounPlural}`}
            style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', minWidth: 170 }}
          />
          <select
            value={caseSort}
            onChange={(e) => setCaseSort(e.target.value as CaseSort)}
            aria-label="Sort"
            style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="lastSeen">Last seen</option>
            <option value="name">Name</option>
          </select>
          <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowAllCases((v) => !v)}>
            {showAllCases ? 'Show recurring only' : `Show all ${data.cases.length}`}
          </button>
        </div>
      </div>
      {/* Always a bounded scroll window, so the table stays a shorter view. */}
      <div className="card" style={{ padding: 0, maxHeight: 440, overflowY: 'auto' }}>
        {visibleCases.length === 0 ? (
          <div className="muted" style={{ padding: 16, fontSize: 13 }}>
            {caseQuery ? `No ${itemNounPlural} match “${caseQuery}”.` : 'Nothing to show.'}
          </div>
        ) : visibleCases.map((c, i) => (
          <CaseRow key={c.id} c={c} members={data.members} muni={muni} first={i === 0} open={openCase === c.id} onToggle={() => setOpenCase(openCase === c.id ? null : c.id)} />
        ))}
      </div>
    </div>
  )
}

function CaseRow({ c, members, muni, first, open, onToggle }: { c: CaseRollup; members: MemberProfile[]; muni: string; first: boolean; open: boolean; onToggle: () => void }) {
  const propId = c.address ? propertyId(c.address) : ''
  // How each member's remarks on this item read, plus the quotes behind them.
  const stances = useMemo(() => {
    return members
      .map((mem) => {
        const bc = mem.byCase.find((x) => x.caseId === c.id)
        if (!bc) return null
        const quotes = mem.evidence.filter((e) => e.caseId === c.id)
        return { member: mem.member, avgSentiment: bc.avgSentiment, count: bc.count, quotes }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.avgSentiment - a.avgSentiment)
  }, [members, c.id])

  return (
    <div style={{ borderTop: first ? 'none' : '1px solid var(--border)' }}>
      <div onClick={onToggle} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '12px 14px', cursor: 'pointer' }}>
        <span className="muted" style={{ fontSize: 13, lineHeight: '20px', width: 10, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35 }}>{c.name}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 5, fontSize: 12, color: 'var(--muted)' }}>
            {c.applicationType && <span>{c.applicationType}</span>}
            <span>· seen {c.appearances}×</span>
            {lastSeen(c) && <span>· last {fmtDate(lastSeen(c))}</span>}
            {c.lastStatus && <span>· {c.lastStatus}</span>}
            <Spark points={c.trajectory.map((p) => p.sentiment)} />
          </div>
        </div>
        <span style={{ flexShrink: 0 }}><Chip score={c.avgSentiment} /></span>
      </div>
      {open && (
        <div style={{ background: 'var(--panel-2)', padding: '6px 14px 14px 32px' }}>
          <div>
              {(c.address || c.applicant) && (
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  {c.address}{c.address && c.applicant ? ' · ' : ''}{c.applicant ? `Applicant: ${c.applicant}` : ''}
                </div>
              )}
              {propId && (
                <a href={`/admin/municipal/property?muni=${muni}&id=${propId}`}
                   style={{ display: 'inline-block', fontSize: 12, color: 'var(--primary-light)', marginBottom: 12 }}>
                  Property profile →
                </a>
              )}
              {c.themes.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {c.themes.map((t) => <ThemeTag key={t} t={t} />)}
                </div>
              )}

              {/* Where the board stood — per-member tabulation */}
              {stances.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    How members talked about it
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stances.map((s) => (
                      <div key={s.member} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                        <span style={{ width: 130, flexShrink: 0, fontWeight: 600 }}>{s.member}</span>
                        <span style={{ ...sentimentChipStyle(s.avgSentiment), flexShrink: 0 }}>{fmtSent(s.avgSentiment)}</span>
                        <span style={{ flex: 1 }}>
                          {s.quotes.length > 0 ? (
                            <span className="muted">{s.quotes.map((q) => q.evidence).join(' ')}</span>
                          ) : (
                            <span className="muted" style={{ fontStyle: 'italic' }}>{s.count} remark{s.count === 1 ? '' : 's'}, no quote captured</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline across meetings */}
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Across meetings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.timeline.map((ap, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                    <span className="muted" style={{ width: 50, flexShrink: 0, whiteSpace: 'nowrap' }}>{fmtDate(ap.date)}</span>
                    <span style={{ ...sentimentChipStyle(ap.sentiment), flexShrink: 0 }}>{fmtSent(ap.sentiment)}</span>
                    <span style={{ flex: 1 }}>
                      {ap.status && <span style={{ fontWeight: 600 }}>{ap.status}. </span>}
                      <span className="muted">{ap.summary}</span>
                    </span>
                  </div>
                ))}
              </div>
          </div>
        </div>
      )}
    </div>
  )
}
