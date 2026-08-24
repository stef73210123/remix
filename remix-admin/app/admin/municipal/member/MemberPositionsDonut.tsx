'use client'

import { useMemo, useState } from 'react'
import type { MemberEvidence, MemberProfile } from '@/lib/municipal/analysis'
import { sentimentColor, sentimentChipStyle, fmtSent } from '../sentiment'
import { fmtDateShort as fmtDateCompact } from '@/lib/municipal/date'

function fmtDateShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (isNaN(d.getTime())) return iso
  return fmtDateCompact(d)
}

type Mode = 'disposition' | 'vote'
type DispositionBucket = 'favor' | 'neutral' | 'oppose'
type VoteBucket = 'approved' | 'denied' | 'abstained' | 'recused' | 'unrecorded'
type BucketKey = DispositionBucket | VoteBucket

interface BucketDef { key: BucketKey; label: string; color: string }

// How each remark read (supportive/mixed/critical), on the same
// green/slate/coral diverging scale used everywhere else on the profile.
// These describe the remark, not the person, and not a vote — see the
// language note in ../sentiment.ts before relabelling.
const DISPOSITION_BUCKETS: BucketDef[] = [
  { key: 'favor', label: 'Supportive', color: sentimentColor(0.6) },
  { key: 'neutral', label: 'Mixed or neutral', color: sentimentColor(0) },
  { key: 'oppose', label: 'Critical', color: sentimentColor(-0.6) },
]
function dispositionOf(score: number): DispositionBucket {
  if (score >= 0.15) return 'favor'
  if (score <= -0.15) return 'oppose'
  return 'neutral'
}

// An actual recorded vote (approved/denied/abstained/recused) is only
// extractable where the transcript explicitly states one — most items here
// were decided by voice vote/consensus with no individual roll call read
// into the record, so most remarks land in "Not recorded" rather than
// being guessed from how the remark sounded. Abstained/Recused reuse the app's existing
// tier-accent colors (gold/slate-blue) so they read as procedural status,
// not a 3rd/4th sentiment pole.
const VOTE_BUCKETS: BucketDef[] = [
  { key: 'approved', label: 'Approved', color: sentimentColor(0.6) },
  { key: 'denied', label: 'Denied', color: sentimentColor(-0.6) },
  { key: 'abstained', label: 'Abstained', color: '#c79a3a' },
  { key: 'recused', label: 'Recused', color: '#7a8590' },
  { key: 'unrecorded', label: 'Not recorded', color: 'var(--panel-2)' },
]
function voteOf(e: MemberEvidence): VoteBucket {
  const t = `${e.evidence} ${e.stance}`.toLowerCase()
  if (/\brecus(ed|al|ing)?\b/.test(t)) return 'recused'
  if (/\babstain(ed|ing)?\b/.test(t)) return 'abstained'
  if (/\bvoted?\s+(no|against|nay)\b/.test(t) || /\bdissent(ed|ing)?\s+vote\b/.test(t)) return 'denied'
  if (/\bvoted?\s+(yes|aye|in favor|to approve)\b/.test(t) || /\bunanimous(ly)?\s+(approved|adopted|in favor)\b/.test(t)) return 'approved'
  return 'unrecorded'
}

/** Donut of the remarks matched to a member, toggling between how each remark
 *  read and an actual recorded vote pulled from the transcript text where one
 *  exists — with a list to the right that filters to the clicked slice. */
export default function MemberPositionsDonut({ profile }: { profile: MemberProfile }) {
  const [mode, setMode] = useState<Mode>('disposition')
  const [selected, setSelected] = useState<BucketKey | null>(null)

  const bucketDefs = mode === 'disposition' ? DISPOSITION_BUCKETS : VOTE_BUCKETS
  const bucketOf = mode === 'disposition'
    ? (e: MemberEvidence) => dispositionOf(e.score)
    : voteOf

  const grouped = useMemo(() => {
    const g: Partial<Record<BucketKey, MemberEvidence[]>> = {}
    for (const b of bucketDefs) g[b.key] = []
    for (const e of profile.evidence) g[bucketOf(e)]!.push(e)
    for (const k of Object.keys(g) as BucketKey[]) g[k]!.sort((a, b) => b.date.localeCompare(a.date))
    return g as Record<BucketKey, MemberEvidence[]>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, mode])

  const total = profile.evidence.length
  if (total === 0) return null

  const counts = bucketDefs.map((b) => ({ ...b, n: grouped[b.key].length }))
  const recordedVotes = mode === 'vote' ? total - grouped.unrecorded.length : 0
  const visible = selected ? grouped[selected] : [...profile.evidence].sort((a, b) => b.date.localeCompare(a.date))

  const size = 140
  const thickness = 22
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const gap = 2
  let offset = 0

  function switchMode(m: Mode) {
    setMode(m)
    setSelected(null)
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {mode === 'disposition' ? 'How their remarks read' : 'Where a vote was actually recorded'}
        </div>
        <div className="pill-strip" style={{ display: 'flex', gap: 4 }}>
          {([['disposition', 'How it read'], ['vote', 'Recorded votes']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => switchMode(k)}
              className="btn secondary"
              style={{ padding: '4px 9px', fontSize: 12, ...(mode === k ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'vote' && (
        <div className="muted" style={{ fontSize: 11, marginBottom: 12, lineHeight: 1.5, maxWidth: 560 }}>
          {recordedVotes} of {total} remarks have an actual vote (aye, no, abstain or recusal) spoken aloud in the
          recording. Most items are decided by voice vote or by consensus, with no name-by-name roll call read into
          the record, so &ldquo;Not recorded&rdquo; is the usual outcome here — it does not mean the member was absent
          or silent. The Town&apos;s minutes are the place to look up how a vote was formally recorded.
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={mode === 'disposition' ? 'How their remarks read' : 'Where a vote was actually recorded'}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={thickness} />
            <g transform={`rotate(-90 ${cx} ${cy})`}>
              {counts.map((b) => {
                const frac = total > 0 ? b.n / total : 0
                const len = frac * circumference
                const dash = Math.max(len - (b.n > 0 ? gap : 0), 0)
                const isSel = selected === b.key
                const dimmed = !!selected && !isSel
                const el = (
                  <circle
                    key={b.key}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={b.color}
                    strokeWidth={isSel ? thickness + 4 : thickness}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    opacity={dimmed ? 0.35 : 1}
                    style={{ cursor: b.n > 0 ? 'pointer' : 'default', transition: 'opacity .15s ease, stroke-width .15s ease' }}
                    onClick={() => b.n > 0 && setSelected(isSel ? null : b.key)}
                  >
                    <title>{`${b.label}: ${b.n} (${total > 0 ? Math.round((b.n / total) * 100) : 0}%)`}</title>
                  </circle>
                )
                offset += len
                return el
              })}
            </g>
            <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 20, fontWeight: 700, fill: 'var(--fg)' }}>
              {total}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 9.5, fill: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              remarks
            </text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {counts.map((b) => (
              <button
                key={b.key}
                onClick={() => b.n > 0 && setSelected(selected === b.key ? null : b.key)}
                disabled={b.n === 0}
                className="btn secondary"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, textAlign: 'left',
                  padding: '4px 8px', border: 'none', background: selected === b.key ? 'var(--panel-2)' : 'transparent',
                  opacity: selected && selected !== b.key ? 0.45 : 1, cursor: b.n > 0 ? 'pointer' : 'default',
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 2, background: b.color, flexShrink: 0, border: b.key === 'unrecorded' ? '1px solid var(--border)' : undefined }} />
                <span style={{ color: 'var(--muted)', flex: 1 }}>{b.label}</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{b.n}</span>
              </button>
            ))}
            {selected && (
              <button onClick={() => setSelected(null)} className="btn secondary" style={{ fontSize: 11, padding: '3px 8px', marginTop: 4 }}>
                Clear filter
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 240 }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
            {selected ? bucketDefs.find((b) => b.key === selected)!.label : 'All remarks'} · {visible.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
            {visible.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>No remarks in this category.</div>
            ) : (
              visible.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ ...sentimentChipStyle(e.score), flexShrink: 0, marginTop: 2 }}>{fmtSent(e.score)}</span>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>{e.case}</span>
                    <span className="muted" style={{ fontSize: 11 }}> · {fmtDateShort(e.date)} · {e.stance}</span>
                    <div className="muted" style={{ marginTop: 2 }}>{e.evidence}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
