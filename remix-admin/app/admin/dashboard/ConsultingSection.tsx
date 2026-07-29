import { lastBusinessDays, type ConsultingData } from '@/lib/consulting'

const WD = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa']

function dayLabel(ymd: string) {
  const d = new Date(`${ymd}T12:00:00Z`)
  return { wd: WD[d.getUTCDay()], md: `${d.getUTCMonth() + 1}/${d.getUTCDate()}` }
}

function ClientChart({
  name,
  byDate,
  days,
}: {
  name: string
  byDate: Record<string, number>
  days: string[]
}) {
  const values = days.map((d) => byDate[d] ?? 0)
  const total = values.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...values)
  const COL = 40
  const H = 96
  const barW = COL - 14

  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {total.toFixed(1)}h · last 10 business days
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${days.length * COL} ${H + 34}`}
          width="100%"
          height={H + 34}
          role="img"
          aria-label={`${name} hours worked per day`}
        >
          {days.map((d, i) => {
            const v = values[i]
            const h = Math.round((v / max) * H)
            const cx = i * COL + 7 + barW / 2
            const { wd, md } = dayLabel(d)
            return (
              <g key={d}>
                {v > 0 && (
                  <text x={cx} y={H - h - 4} textAnchor="middle" fontSize="9" fill="var(--primary)">
                    {v % 1 === 0 ? v : v.toFixed(1)}
                  </text>
                )}
                <rect
                  x={i * COL + 7}
                  y={H - h}
                  width={barW}
                  height={h}
                  rx={3}
                  fill="var(--primary)"
                  fillOpacity={v > 0 ? 0.55 : 0.12}
                  stroke="var(--border)"
                />
                <text x={cx} y={H + 13} textAnchor="middle" fontSize="9" fill="var(--muted)">
                  {wd}
                </text>
                <text x={cx} y={H + 25} textAnchor="middle" fontSize="8" fill="var(--muted)">
                  {md}
                </text>
              </g>
            )
          })}
          <line x1="0" y1={H} x2={days.length * COL} y2={H} stroke="var(--border)" />
        </svg>
      </div>
    </div>
  )
}

export default function ConsultingSection({
  data,
  clients,
  connected,
}: {
  data: ConsultingData | null
  clients: string[]
  connected: boolean
}) {
  const days = lastBusinessDays(10)
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Consulting</h2>
      {!connected && (
        <p className="muted" style={{ fontSize: 12, margin: '0 0 12px', maxWidth: 640 }}>
          Not yet connected — set <code>CONSULTING_HOURS_URL</code> to the time-tracker web app URL.
          Showing zeros until then.
        </p>
      )}
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        }}
      >
        {clients.map((c) => (
          <ClientChart key={c} name={c} byDate={data?.[c] ?? {}} days={days} />
        ))}
      </div>
    </section>
  )
}
