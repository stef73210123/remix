'use client'

import { useMemo } from 'react'
import type { Property } from '@/lib/municipal/property'
import { sentimentChipStyle, fmtSent, sentimentColor } from '../sentiment'
import { fmtDateShort } from '@/lib/municipal/date'

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''))
  if (isNaN(d.getTime())) return iso
  return fmtDateShort(d)
}

// Generic municipal lifecycle stages, inferred from each appearance's status.
const STAGES = ['Intake', 'Under review', 'Public hearing', 'Decision']
function stageOf(status: string | undefined): number {
  const s = (status || '').toLowerCase()
  if (/approv|denied|deny|adopt|grant|withdraw|closed|final|resolution|referred out|dismiss/.test(s)) return 3
  if (/hearing/.test(s)) return 2
  if (/review|work session|referr|discussion|continu|pending|revised|extension|adjourn|open/.test(s)) return 1
  return 0
}

/** Donut showing how many lifecycle stages the case has advanced through. */
function ProgressRing({ reached, total }: { reached: number; total: number }) {
  const size = 104, sw = 10, r = (size - sw) / 2, c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, reached / total))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={sw} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary)" strokeWidth={sw}
        strokeDasharray={`${c * frac} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="46%" textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--text)">{reached}</text>
      <text x="50%" y="63%" textAnchor="middle" fontSize={11} fill="var(--muted)">of {total} stages</text>
    </svg>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  )
}

/**
 * "Case at a glance" detail header, styled after a project-intelligence card:
 * name + address + status tags, a facts row, a progress ring, and a horizontal
 * milestone stepper of the case's inferred lifecycle. Rendered in a white box.
 */
export default function CaseDetail({ prop, muni }: { prop: Property; muni: string }) {
  const appearances = useMemo(
    () => [...prop.timeline].sort((a, b) => a.date.localeCompare(b.date)),
    [prop.timeline],
  )
  const maxStage = useMemo(
    () => appearances.reduce((m, e) => Math.max(m, stageOf(e.status)), 0),
    [appearances],
  )
  const byStage = useMemo(() => {
    const g: { date: string; status: string; summary: string; board: string }[][] = [[], [], [], []]
    for (const e of appearances) g[stageOf(e.status)].push({ date: e.date, status: e.status || '', summary: e.summary || '', board: e.board })
    return g
  }, [appearances])

  const applicant = prop.parties.find((p) => /applicant|petitioner|owner/i.test(p.role))?.name
  const reached = maxStage + 1
  const currentStatus = appearances[appearances.length - 1]?.status || prop.lastStatus || ''

  return (
    <div className="card" style={{ padding: 20, marginBottom: 26 }}>
      {/* Header row: identity + status tags | progress ring */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <h1 className="page-title" style={{ margin: '0 0 4px', fontSize: 24 }}>{prop.label}</h1>
          <div className="muted" style={{ fontSize: 14, marginBottom: 12 }}>{prop.address}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {currentStatus && <span className="badge state" style={{ fontSize: 12 }}>{currentStatus}</span>}
            {prop.applicationTypes.slice(0, 2).map((t) => <span key={t} className="badge">{t}</span>)}
            <span style={sentimentChipStyle(prop.avgSentiment)} title="Progress score">{fmtSent(prop.avgSentiment)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ProgressRing reached={reached} total={STAGES.length} />
          <div>
            <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current stage</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-light)' }}>{STAGES[maxStage]}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Since {fmtDate(prop.firstSeen)}</div>
          </div>
        </div>
      </div>

      {/* Facts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, margin: '18px 0 6px', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <Fact
          label="Boards"
          value={
            <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
              {prop.boards.map((b) => (
                <a key={b.bodyKey} href={`/admin/municipal/board?muni=${muni}&body=${b.bodyKey}`} style={{ color: 'var(--primary-light)' }}>{b.board}</a>
              ))}
            </span>
          }
        />
        <Fact label="Applicant" value={applicant || '—'} />
        <Fact label="Application type" value={prop.applicationTypes[0] || '—'} />
        <Fact label="Heard" value={`${fmtDate(prop.firstSeen)} → ${fmtDate(prop.lastSeen)}`} />
        <Fact label="Appearances" value={`${prop.appearances}×`} />
      </div>

      {/* Milestone stepper */}
      <div style={{ overflowX: 'auto', marginTop: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(150px, 1fr))`, gap: 0, minWidth: 620 }}>
          {STAGES.map((stage, i) => {
            const done = i <= maxStage
            const current = i === maxStage
            const items = byStage[i]
            const color = current ? 'var(--primary)' : done ? sentimentColor(0.4) : 'var(--border)'
            return (
              <div key={stage} style={{ padding: '0 8px' }}>
                {/* rail + node */}
                <div style={{ position: 'relative', height: 16, marginBottom: 10 }}>
                  <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 2, background: 'var(--border)' }} />
                  {i === 0 && <div style={{ position: 'absolute', top: 7, left: 0, width: '50%', height: 2, background: 'var(--panel)' }} />}
                  {i === STAGES.length - 1 && <div style={{ position: 'absolute', top: 7, right: 0, width: '50%', height: 2, background: 'var(--panel)' }} />}
                  <div style={{ position: 'absolute', top: 1, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: 999, background: color, border: '2px solid var(--panel)' }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{i + 1}. {stage}</div>
                <div className="muted" style={{ textAlign: 'center', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                  {current ? 'Current' : done ? 'Done' : 'Not yet'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.length === 0 ? (
                    <div className="muted" style={{ fontSize: 11, textAlign: 'center' }}>—</div>
                  ) : items.map((it, j) => (
                    <div key={j} style={{ background: 'var(--panel-2)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{fmtDate(it.date)}</div>
                      {it.status && <div className="muted" style={{ fontSize: 10 }}>{it.status}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
