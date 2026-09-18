'use client'

import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { CaseRollup, MemberProfile } from '@/lib/municipal/analysis'
import { sentimentChipStyle, fmtSent, dispositionLabel } from '../sentiment'
import { useLockBodyScroll } from '../useLockBodyScroll'
import { propertyId } from '@/lib/municipal/propertyId'
import { parseAddress } from '@/lib/municipal/address'
import { typeTags, statusBucket, isConditional, STATUS_LABELS, type StatusBucket } from '@/lib/municipal/caseFacets'
import type { MeetingDoc } from './CaseExplorer'
import { fmtDate } from './caseFormat'

/**
 * One case, in full — the profile behind a row in the explorer.
 *
 * This used to be an accordion inside the list, which forced every case to be
 * read in a column the width of a table row and pushed the next fifty cases off
 * screen while you read one. A case has enough to say — who applied, which
 * regimes it engages, how each member spoke about it, and what happened at every
 * meeting it appeared at — that it deserves the room.
 *
 * `prev`/`next` walk the same filtered, sorted list the explorer is showing, so
 * a reader who filtered to one street can page down it without closing and
 * reopening. Arrow keys do the same thing, and Escape closes — the shell,
 * scroll lock and portal all match the other lightboxes on the site.
 */
export default function CaseProfile({
  c,
  members,
  muni,
  docsByDate,
  position,
  onPrev,
  onNext,
  onClose,
}: {
  c: CaseRollup
  members: MemberProfile[]
  muni: string
  docsByDate: Map<string, MeetingDoc['assets']>
  /** Where this case sits in the list behind the modal, 1-based. */
  position: { index: number; total: number } | null
  onPrev: (() => void) | null
  onNext: (() => void) | null
  onClose: () => void
}) {
  useLockBodyScroll()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && onPrev) onPrev()
      else if (e.key === 'ArrowRight' && onNext) onNext()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  const parsed = c.address ? parseAddress(c.address) : null
  const propId = c.address ? propertyId(c.address) : ''
  const tags = typeTags(c.applicationType)
  const bucket = statusBucket(c.lastStatus)

  // Members who spoke on this case, most supportive first, with whatever the
  // analysis captured of what they actually said.
  const stances = useMemo(
    () =>
      members
        .map((mem) => {
          const bc = mem.byCase.find((x) => x.caseId === c.id)
          if (!bc) return null
          return {
            member: mem.member,
            avgSentiment: bc.avgSentiment,
            count: bc.count,
            quotes: mem.evidence.filter((e) => e.caseId === c.id),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.avgSentiment - a.avgSentiment),
    [members, c.id],
  )

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3dvh 2vw',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={c.name}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(860px, 100%)', maxHeight: '92dvh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.3 }}>{c.name}</div>
            {c.address && (
              <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                {c.address}
                {/* The street only earns a mention when the line doesn't already
                    spell it — "Tax parcel 107.04 … (Bedford Road)" does, "45
                    Bedford Road" plainly doesn't need "· Bedford Road" after it. */}
                {parsed?.kind === 'street' && !(c.address || '').toLowerCase().includes(parsed.name.toLowerCase()) && (
                  <span style={{ marginLeft: 6 }}>· {parsed.name}</span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {position && (onPrev || onNext) && (
              <>
                <button
                  onClick={onPrev ?? undefined}
                  disabled={!onPrev}
                  aria-label="Previous"
                  className="btn secondary"
                  style={{ padding: '4px 9px', fontSize: 13, lineHeight: 1, opacity: onPrev ? 1 : 0.4 }}
                >‹</button>
                <span className="muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                  {position.index} / {position.total}
                </span>
                <button
                  onClick={onNext ?? undefined}
                  disabled={!onNext}
                  aria-label="Next"
                  className="btn secondary"
                  style={{ padding: '4px 9px', fontSize: 13, lineHeight: 1, opacity: onNext ? 1 : 0.4 }}
                >›</button>
              </>
            )}
            <button onClick={onClose} aria-label="Close" className="btn secondary" style={{ padding: '4px 10px', fontSize: 14, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <div data-scroll-lock-allow style={{ padding: '14px 18px 20px', overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <span className="badge" style={{ fontSize: 11 }} title={c.lastStatus || undefined}>
              {STATUS_LABELS[bucket as StatusBucket]}
              {bucket === 'approved' && isConditional(c.lastStatus) ? ' · with conditions' : ''}
            </span>
            <span
              style={sentimentChipStyle(c.avgSentiment)}
              title={`${dispositionLabel(c.avgSentiment)} — how the board's recorded discussion read, not a decision`}
            >
              {fmtSent(c.avgSentiment)}
            </span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {c.appearances} meeting{c.appearances === 1 ? '' : 's'}
              {c.firstSeen && c.lastSeen && (
                c.firstSeen === c.lastSeen
                  ? ` · ${fmtDate(c.firstSeen)}`
                  : ` · ${fmtDate(c.firstSeen)} – ${fmtDate(c.lastSeen)}`
              )}
            </span>
          </div>

          {(c.applicant || c.applicationType) && (
            <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
              {c.applicant && (
                <div><span className="muted">Applicant</span> · {c.applicant}</div>
              )}
              {c.applicationType && (
                <div><span className="muted">Filed as</span> · {c.applicationType}</div>
              )}
            </div>
          )}

          {(tags.length > 0 || c.themes.length > 0) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {tags.map((t) => <span key={`t-${t}`} className="badge" style={{ fontSize: 11 }}>{t}</span>)}
              {c.themes.map((t) => <span key={`h-${t}`} className="badge state" style={{ fontSize: 11 }}>{t}</span>)}
            </div>
          )}

          {propId && (
            <a
              href={`/admin/municipal/property?muni=${muni}&id=${propId}`}
              style={{ display: 'inline-block', fontSize: 12.5, color: 'var(--primary-light)', marginBottom: 18 }}
            >
              Everything else at this address →
            </a>
          )}

          {stances.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <SubHead>How members talked about it</SubHead>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {stances.map((s) => (
                  <div key={s.member} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                    <span style={{ width: 130, flexShrink: 0, fontWeight: 600 }}>{s.member}</span>
                    <span style={{ ...sentimentChipStyle(s.avgSentiment), flexShrink: 0 }}>{fmtSent(s.avgSentiment)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {s.quotes.length > 0 ? (
                        <span className="muted">{s.quotes.map((q) => q.evidence).join(' ')}</span>
                      ) : (
                        <span className="muted" style={{ fontStyle: 'italic' }}>
                          {s.count} remark{s.count === 1 ? '' : 's'}, no quote captured
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <SubHead>Across meetings</SubHead>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {c.timeline.map((ap, i) => {
                const assets = docsByDate.get((ap.date || '').slice(0, 10)) || []
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                    <span className="muted" style={{ width: 52, flexShrink: 0, whiteSpace: 'nowrap' }}>{fmtDate(ap.date)}</span>
                    <span style={{ ...sentimentChipStyle(ap.sentiment), flexShrink: 0 }}>{fmtSent(ap.sentiment)}</span>
                    <span style={{ flex: 1, minWidth: 0, lineHeight: 1.55 }}>
                      {ap.status && <span style={{ fontWeight: 600 }}>{ap.status}. </span>}
                      <span className="muted">{ap.summary}</span>
                      {assets.length > 0 && (
                        <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', marginLeft: 6, verticalAlign: 'middle' }}>
                          {assets.map((a, j) => {
                            const href = a.blobUrl || a.sourceUrl || ''
                            if (!href) return null
                            return (
                              <a
                                key={j}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="badge state"
                                style={{ textDecoration: 'none', fontSize: 10.5 }}
                                title={`That meeting's ${a.kind}${a.pageCount ? ` — ${a.pageCount} pages` : ''}`}
                              >
                                {a.kind.charAt(0).toUpperCase() + a.kind.slice(1)} ↗
                              </a>
                            )
                          })}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="muted" style={{ fontSize: 10.5, marginTop: 12, lineHeight: 1.5, maxWidth: 680 }}>
              Document links open the whole agenda packet or minutes for that meeting — the Town
              publishes one file per meeting rather than one per submittal.
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 9 }}>
      {children}
    </div>
  )
}
