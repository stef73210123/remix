'use client'

import { useRef } from 'react'
import type { AnalysisDataset, MemberProfile } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent, dispositionLabel } from '../sentiment'
import TranscriptCaveat from '../TranscriptCaveat'

/** Diverging bar: center = 0, fill extends left (neg) or right (pos). */
function SentBar({ score, height = 8 }: { score: number; height?: number }) {
  const s = Math.max(-1, Math.min(1, score))
  const half = Math.abs(s) * 50
  return (
    <div style={{ position: 'relative', height, background: 'var(--panel-2)', borderRadius: height / 2 }}>
      <div style={{ position: 'absolute', left: '50%', top: -1, bottom: -1, width: 1, background: 'var(--border)' }} />
      <div
        style={{
          position: 'absolute', top: 0, height: '100%', background: sentimentColor(s), borderRadius: height / 2,
          ...(s >= 0 ? { left: '50%', width: `${half}%` } : { right: '50%', width: `${half}%` }),
        }}
      />
    </div>
  )
}

function Chip({ score }: { score: number }) {
  return (
    <span style={sentimentChipStyle(score)} title={`${dispositionLabel(score)} — how this member's recorded remarks read overall, not a vote count`}>
      {fmtSent(score)}
    </span>
  )
}

function MemberCard({ mem, muni, body, role, inactive = false }: { mem: MemberProfile; muni: string; body: string; role?: string; inactive?: boolean }) {
  const conf = mem.confidenceMix || {}
  const total = (conf.high || 0) + (conf.medium || 0) + (conf.low || 0) || 1
  const topThemes = mem.byTheme.slice(0, 3)
  return (
    <a
      href={`/admin/municipal/member?muni=${muni}&body=${body}&byName=${encodeURIComponent(mem.member)}`}
      className="card"
      data-member-card
      style={{
        padding: 14, textDecoration: 'none', display: 'block', opacity: inactive ? 0.55 : 1,
        flex: '0 0 230px', minWidth: 0, scrollSnapAlign: 'start',
      }}
      title={inactive ? `${mem.member} — no longer serving on this board` : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          {mem.member}
          {inactive && (
            <span className="badge" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>
              Former
            </span>
          )}
        </div>
        <Chip score={mem.avgSentiment} />
      </div>
      {role && (
        <div className="muted" style={{ fontSize: 12, marginTop: 3, fontWeight: 600, color: 'var(--primary-light)' }}>{role}</div>
      )}
      <div style={{ margin: '10px 0 4px' }}><SentBar score={mem.avgSentiment} /></div>
      <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
        {mem.totalPositions} remarks · {Math.round(((conf.high || 0) / total) * 100)}% a confident match
      </div>
      {topThemes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {topThemes.map((t) => (
            <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: sentimentColor(t.avgSentiment), flexShrink: 0 }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.theme}</span>
              <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtSent(t.avgSentiment)}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, marginTop: 12, color: 'var(--primary-light)' }}>Full profile →</div>
    </a>
  )
}

/** "Board members" carousel, sourced from the transcript-analysis dataset — one
 *  card per member showing how their recorded remarks read. Sits at the top of the
 *  board page, above the rest of the analysis (overall tone, timeline, topics).
 *  Wording here describes remarks, never people — see ../sentiment.ts. */
export default function BoardMemberCards({ data, muni, body }: { data: AnalysisDataset; muni: string; body: string }) {
  const memberScrollRef = useRef<HTMLDivElement>(null)
  const m = data.meta
  const inactiveSet = new Set(m.inactiveMembers || [])
  const withPositions = data.members.filter((mem) => mem.totalPositions > 0)
  if (withPositions.length === 0) return null

  const scrollMembersByCard = (dir: 1 | -1) => {
    const el = memberScrollRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-member-card]')
    const step = (card?.offsetWidth ?? 230) + 12
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          Board members
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {withPositions.length}</span>
        </h2>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => scrollMembersByCard(-1)} aria-label="Previous" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>‹</button>
          <button onClick={() => scrollMembersByCard(1)} aria-label="Next" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14 }}>›</button>
        </div>
      </div>
      {/* These cards are the first thing on a board page, so the caveat has to
          travel with them rather than waiting for the analysis section below. */}
      <TranscriptCaveat />
      <div
        ref={memberScrollRef}
        style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
          scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
          marginBottom: data.members.some((mem) => mem.totalPositions === 0) ? 10 : 0,
        }}
      >
        {withPositions
          // Active members first (stable within each group); former/inactive members sink to the bottom.
          .sort((a, b) => Number(inactiveSet.has(a.member)) - Number(inactiveSet.has(b.member)))
          .map((mem) => (
            <MemberCard key={mem.member} mem={mem} muni={muni} body={body} role={m.roles?.[mem.member]} inactive={inactiveSet.has(mem.member)} />
          ))}
      </div>
      {data.members.filter((mem) => mem.totalPositions === 0).length > 0 && (
        <div className="muted" style={{ fontSize: 12 }}>
          We haven&apos;t been able to match any remarks to these members yet — that usually means the
          recordings we have don&apos;t name them clearly, not that they didn&apos;t speak:{' '}
          {data.members.filter((mem) => mem.totalPositions === 0).map((mem) => mem.member).join(', ')}
        </div>
      )}
    </div>
  )
}
