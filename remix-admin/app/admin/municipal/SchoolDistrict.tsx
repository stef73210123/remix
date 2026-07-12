'use client'

import { useState } from 'react'

/**
 * School-district context for a town. North Castle is split across districts —
 * Byram Hills (Armonk and most of the town) and Valhalla (North White Plains) —
 * so a town can list more than one, toggled here. Static, committed info;
 * renders nothing for towns without an entry.
 */

interface School {
  name: string
  grades: string
}
interface Foundation {
  name: string
  website: string
  websiteLabel: string
}
interface DistrictInfo {
  name: string
  short: string
  serves: string
  enrollment: string
  schools: School[]
  note?: string
  website: string
  websiteLabel: string
  /** District's own education foundation — grants/fundraising beyond the operating budget. */
  foundation?: Foundation
  /** Link to the district's current academic calendar. */
  calendarUrl?: string
}

const DISTRICTS: Record<string, DistrictInfo[]> = {
  nc: [
    {
      name: 'Byram Hills Central School District',
      short: 'Byram Hills CSD',
      serves: 'Armonk and most of the Town of North Castle',
      enrollment: '≈ 2,400 students',
      schools: [
        { name: 'Coman Hill Elementary', grades: 'K–2' },
        { name: 'Wampus Elementary', grades: '3–5' },
        { name: 'H.C. Crittenden Middle School', grades: '6–8' },
        { name: 'Byram Hills High School', grades: '9–12' },
      ],
      note:
        'Byram Hills is consistently ranked among the top public districts in Westchester and New York State. ' +
        'Parts of North Castle lie outside it — North White Plains falls in the Valhalla UFSD and the Banksville ' +
        'area in the Bedford CSD (both in the toggle above).',
      website: 'https://www.byramhills.org',
      websiteLabel: 'byramhills.org',
      foundation: {
        name: 'Byram Hills Education Foundation',
        website: 'https://www.byramhillsfoundation.org/',
        websiteLabel: 'byramhillsfoundation.org',
      },
      calendarUrl: 'https://www.byramhills.org/district/calendar',
    },
    {
      name: 'Valhalla Union Free School District',
      short: 'Valhalla UFSD',
      serves: 'The North White Plains section of North Castle (plus the hamlet of Valhalla)',
      enrollment: '≈ 1,433 students',
      schools: [
        { name: 'Virginia Road School', grades: 'K–2' },
        { name: 'Kensico School', grades: '3–5' },
        { name: 'Valhalla Middle School', grades: '6–8' },
        { name: 'Valhalla High School', grades: '9–12' },
      ],
      note:
        'Valhalla UFSD serves the North White Plains neighborhood of North Castle along with the hamlet of Valhalla ' +
        'in neighboring Mount Pleasant. Its Virginia Road School sits on Virginia Road in North White Plains.',
      website: 'https://www.valhallaschools.org',
      websiteLabel: 'valhallaschools.org',
      foundation: {
        name: 'Valhalla Schools Foundation',
        website: 'https://www.valhallasf.org/',
        websiteLabel: 'valhallasf.org',
      },
      calendarUrl: 'https://www.valhallaschools.org/apps/events/',
    },
    {
      name: 'Bedford Central School District',
      short: 'Bedford CSD',
      serves: 'The Banksville corner of North Castle (plus Bedford, Bedford Hills, Mount Kisco & Pound Ridge)',
      enrollment: '≈ 3,400 students',
      schools: [
        { name: 'Five elementary schools', grades: 'K–5' },
        { name: 'Fox Lane Middle School', grades: '6–8' },
        { name: 'Fox Lane High School', grades: '9–12' },
      ],
      note:
        'Bedford Central serves the Banksville area of North Castle. Its five elementary schools — Bedford Village, ' +
        'Bedford Hills, West Patent, Pound Ridge and Mount Kisco — feed Fox Lane Middle and Fox Lane High School on ' +
        'the shared Fox Lane campus near I-684.',
      website: 'https://www.bcsdny.org',
      websiteLabel: 'bcsdny.org',
    },
  ],
}

export default function SchoolDistrict({ muniKey }: { muniKey: string }) {
  const list = DISTRICTS[muniKey]
  const [idx, setIdx] = useState(0)
  if (!list || list.length === 0) return null
  const d = list[Math.min(idx, list.length - 1)]

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>
          School district{list.length > 1 ? 's' : ''}
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {d.short}</span>
        </h2>
        {list.length > 1 && (
          <div className="pill-strip" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {list.map((x, i) => (
              <button
                key={x.short}
                onClick={() => setIdx(i)}
                className={i === idx ? 'btn' : 'btn secondary'}
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                {x.short}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{d.name}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{d.serves}</div>
          </div>
          <span className="badge state">{d.enrollment}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, margin: '14px 0 4px' }}>
          {d.schools.map((s) => (
            <div key={s.name} style={{ background: 'var(--panel-2)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{s.name}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Grades {s.grades}</div>
            </div>
          ))}
        </div>

        {d.note && (
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.55, marginTop: 10 }}>{d.note}</div>
        )}
        <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <a href={d.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary-light)' }}>
            {d.websiteLabel} ↗
          </a>
          {d.calendarUrl && (
            <a href={d.calendarUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary-light)' }}>
              Academic calendar ↗
            </a>
          )}
          {d.foundation && (
            <a href={d.foundation.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary-light)' }}>
              {d.foundation.name} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
