'use client'

/**
 * School-district context for a town. North Castle (Armonk) is served chiefly by
 * the Byram Hills Central School District; small portions fall in neighboring
 * districts. Static, committed info — renders nothing for towns without an entry.
 */

interface School {
  name: string
  grades: string
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
}

const DISTRICTS: Record<string, DistrictInfo> = {
  nc: {
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
      'Small parts of North Castle lie outside it — North White Plains is served by the Valhalla UFSD and ' +
      'the Banksville area by the Bedford CSD.',
    website: 'https://www.byramhills.org',
    websiteLabel: 'byramhills.org',
  },
}

export default function SchoolDistrict({ muniKey }: { muniKey: string }) {
  const d = DISTRICTS[muniKey]
  if (!d) return null

  return (
    <div style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>
        School district
        <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> · {d.short}</span>
      </h2>
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
        <div style={{ marginTop: 10 }}>
          <a href={d.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary-light)' }}>
            {d.websiteLabel} ↗
          </a>
        </div>
      </div>
    </div>
  )
}
