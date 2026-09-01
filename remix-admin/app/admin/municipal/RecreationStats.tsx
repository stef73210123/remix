'use client'

import { useEffect, useState } from 'react'
import type { RecreationDataset, RecreationSummary, RecreationYear } from '@/lib/municipal/recreation'

type Payload = RecreationDataset & { summary: RecreationSummary }

/**
 * How the Town's recreation programme actually ran, year by year.
 *
 * The interesting finding is a shape, not a number: most sections run *under*
 * their minimum enrolment while a steady minority turn people away. That points
 * at what is offered rather than at demand, and it is invisible in the budget,
 * which shows only what the department spent.
 *
 * The per-year row shows the status mix as one stacked bar — sections are parts
 * of a whole, so a single bar is honest where four bars would invite reading
 * them as independent series. The partial final year is labelled and excluded
 * from every total, since its counts are a fraction of a year and would drag
 * any average down for no reason.
 */
export default function RecreationStats({ muni }: { muni: string }) {
  const [data, setData] = useState<Payload | null>(null)

  useEffect(() => {
    if (!muni) return
    let live = true
    fetch(`/admin/api/municipal/recreation?muni=${encodeURIComponent(muni)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live) setData(d && Array.isArray(d.years) ? d : null)
      })
      .catch(() => {
        if (live) setData(null)
      })
    return () => {
      live = false
    }
  }, [muni])

  if (!data || !data.years?.length) return null
  const { meta, years, summary, mostWaitlisted, topFacilities } = data
  const maxSections = Math.max(...years.map((y) => y.sections), 1)

  return (
    <div className="card" style={{ padding: 16, marginBottom: 24 }}>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        Programmes &amp; facilities
        <span style={{ textTransform: 'none', letterSpacing: 0 }}> · {meta.firstYear}–{meta.lastYear}</span>
      </div>
      <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 14, maxWidth: 700 }}>
        Every recreation section the Town ran and every facility booking it took, from the
        department&apos;s own records. Section-level only — the released reports carry no
        registrant names.
      </div>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat value={summary.totalSections.toLocaleString()} label="sections run" />
        <Stat value={`${summary.pctBelow}%`} label="ran under their minimum enrolment" />
        <Stat value={summary.totalWaitlisted.toLocaleString()} label="sections with a waiting list" />
        <Stat value={summary.totalReservations.toLocaleString()} label="facility bookings" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
        {years.map((y) => (
          <YearRow key={y.year} y={y} max={maxSections} />
        ))}
      </div>
      <Legend />

      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginTop: 16 }}>
        <MiniList
          title="Most often waitlisted"
          rows={mostWaitlisted.map((r) => [r.program, `${r.sections} section${r.sections === 1 ? '' : 's'}`])}
        />
        <MiniList
          title="Busiest facilities"
          rows={topFacilities.map((r) => [r.facility, `${r.reservations.toLocaleString()} bookings`])}
        />
      </div>

      <div className="muted" style={{ fontSize: 10.5, lineHeight: 1.5, marginTop: 14, maxWidth: 720 }}>
        Released under FOIL request 26-580. {meta.partialYear} is a partial year and is excluded
        from the totals above. A section counts as under-enrolled when it ran below the minimum the
        department set for it.
      </div>
    </div>
  )
}

const SEGMENTS: { key: keyof RecreationYear; label: string; color: string }[] = [
  { key: 'below', label: 'Under minimum', color: 'color-mix(in srgb, var(--muted) 45%, transparent)' },
  { key: 'full', label: 'Full', color: 'color-mix(in srgb, var(--primary) 55%, transparent)' },
  { key: 'waitlist', label: 'Waitlisted', color: 'var(--primary)' },
  { key: 'over', label: 'Over cap', color: 'var(--warn)' },
]

function YearRow({ y, max }: { y: RecreationYear; max: number }) {
  const width = (y.sections / max) * 100
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 10, alignItems: 'center' }}>
      <div style={{ fontSize: 12 }}>
        {y.year}
        {y.partial && <span className="muted" style={{ fontSize: 10.5 }}> · partial</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {/* Outer track takes the flex space; the bar inside it is scaled to the
            year's section count. Putting `flex: 1` on the bar itself made every
            year the same length, which hid the partial year entirely. */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', width: `${width}%`, minWidth: 40 }}>
            {SEGMENTS.map((s) => {
              const v = y[s.key] as number
              if (!v) return null
              return (
                <div
                  key={s.key}
                  title={`${s.label}: ${v}`}
                  style={{ width: `${(v / y.sections) * 100}%`, background: s.color, borderRight: '2px solid var(--panel)' }}
                />
              )
            })}
          </div>
        </div>
        <div className="muted" style={{ fontSize: 11.5, minWidth: 200, textAlign: 'right' }}>
          {y.sections} sections · {y.enrolment.toLocaleString()} enrolled · {y.reservations.toLocaleString()} bookings
        </div>
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
      {SEGMENTS.map((s) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
          <span className="muted" style={{ fontSize: 11 }}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function MiniList({ title, rows }: { title: string; rows: [string, string][] }) {
  if (rows.length === 0) return null
  return (
    <div style={{ minWidth: 240, flex: '1 1 240px' }}>
      <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {title}
      </div>
      {rows.map(([a, b]) => (
        <div key={a} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, padding: '2px 0' }}>
          <span>{a}</span>
          <span className="muted" style={{ flexShrink: 0 }}>{b}</span>
        </div>
      ))}
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
