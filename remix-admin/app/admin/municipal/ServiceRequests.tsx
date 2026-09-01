'use client'

import { useEffect, useState } from 'react'
import type {
  ServiceRequestCategory,
  ServiceRequestMeta,
  ServiceRequestSummary,
} from '@/lib/municipal/serviceRequests'

interface Payload {
  meta: ServiceRequestMeta
  categories: ServiceRequestCategory[]
  summary: ServiceRequestSummary
}

/** Categories below this see too few requests for a rate to mean much. */
const THIN = 5

/**
 * What residents reported, and how long the Town took to close it.
 *
 * The rest of the site measures deliberation — who said what at which meeting.
 * This measures delivery, against a standard the Town set for itself, which is
 * why it reads as a scoreboard rather than a document list.
 *
 * Deliberately restrained in how it encodes that judgement:
 *
 *  - One measure per bar (share closed within target). Volume sits beside it as
 *    a number rather than a second axis, because two scales in one row invites
 *    exactly the misreading that a single busy category is also the worst one.
 *  - One hue, not a red/green verdict. The numbers are stark enough on their
 *    own, and colouring them would have the site editorialising where it should
 *    be reporting. The bar is short when performance is poor; that is the point.
 *  - A rate is only shown where the Town configured a target and enough requests
 *    exist for it to mean something. One graffiti report closed on time is not a
 *    100% success rate in any useful sense, and Street Sign has no target at all
 *    — which is not the same as a target missed every time.
 */
export default function ServiceRequests({ muni, compact = false }: { muni: string; compact?: boolean }) {
  const [data, setData] = useState<Payload | null>(null)

  useEffect(() => {
    if (!muni) return
    let live = true
    fetch(`/admin/api/municipal/service-requests?muni=${encodeURIComponent(muni)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // { available: false } for a town with no dataset — same as a failure
        // from the page's point of view: render nothing.
        if (live) setData(d && Array.isArray(d.categories) ? d : null)
      })
      .catch(() => {
        if (live) setData(null)
      })
    return () => {
      live = false
    }
  }, [muni])

  if (!data || !data.categories?.length) return null
  const { meta, summary } = data
  const rows = compact ? summary.ranked.slice(0, 5) : summary.ranked
  const max = Math.max(...summary.ranked.map((c) => c.created), 1)

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        Service requests
        <span style={{ textTransform: 'none', letterSpacing: 0 }}> · {summary.totalRequests}</span>
      </div>
      <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 14, maxWidth: 700 }}>
        What residents reported through the Town&apos;s SeeClickFix system between{' '}
        {fmtMonth(meta.periodStart)} and {fmtMonth(meta.periodEnd)}, and how it did against the
        response times it sets for itself.
      </div>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat value={String(summary.totalRequests)} label="requests" />
        {summary.pctMet !== null && (
          <Stat value={`${summary.pctMet}%`} label={`closed on time (of ${summary.withTarget} with a target)`} />
        )}
        <Stat value={String(summary.totalOverdue)} label="went past the Town's target" />
        {summary.slowest?.avgDaysToClose != null && (
          <Stat
            value={`${Math.round(summary.slowest.avgDaysToClose)} days`}
            label={`slowest average — ${summary.slowest.category}`}
          />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {rows.map((c) => {
          const rate = c.pctClosedWithinSla
          const rateShown = rate !== null && c.created >= THIN
          return (
            <div key={c.category} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 12, lineHeight: 1.3 }}>
                {c.category}
                <span className="muted"> · {c.created}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div
                  aria-hidden
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    background: 'color-mix(in srgb, var(--muted) 18%, transparent)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${((c.created / max) * 100).toFixed(1)}%`,
                      height: '100%',
                      borderRadius: 4,
                      background: 'var(--primary)',
                    }}
                  />
                </div>
                <div className="muted" style={{ fontSize: 11.5, minWidth: 190, textAlign: 'right' }}>
                  {rateShown ? (
                    <>
                      <strong style={{ color: 'var(--text)' }}>{rate}%</strong> within {c.slaLabel}
                      {c.avgDaysToClose != null && <> · {fmtDays(c.avgDaysToClose)} avg</>}
                    </>
                  ) : c.slaDays === null ? (
                    <>no target set{c.avgDaysToClose != null && <> · {fmtDays(c.avgDaysToClose)} avg</>}</>
                  ) : (
                    <>too few to rate{c.avgDaysToClose != null && <> · {fmtDays(c.avgDaysToClose)} avg</>}</>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="muted" style={{ fontSize: 10.5, lineHeight: 1.5, marginTop: 14, maxWidth: 720 }}>
        The Town&apos;s own figures, unedited — released under FOIL request 26-559. The bar shows how
        many requests each category received; the figure beside it is the share closed within the
        Town&apos;s target for that category. Categories with fewer than {THIN} requests are listed
        but not rated.
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11, marginTop: 2, maxWidth: 190, lineHeight: 1.35 }}>{label}</div>
    </div>
  )
}

/** Avoid "0.1 days" and "26 days" sitting in the same column at different precision. */
function fmtDays(d: number): string {
  if (d < 1) return '<1 day'
  return `${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'}`
}

function fmtMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return y && m ? `${MONTHS[m - 1]} ${y}` : iso
}
