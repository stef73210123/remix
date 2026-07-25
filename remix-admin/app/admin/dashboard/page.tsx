import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import AdminNav from '@/app/admin/AdminNav'
import TodayPanel from './TodayPanel'
import {
  getLatestBriefing,
  getFitnessState,
  etDate,
  DEFAULT_FITNESS_ITEMS,
} from '@/lib/briefing'

export const dynamic = 'force-dynamic'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

/* ── Placeholder chart primitives ────────────────────────────────────────
   Static SVG scaffolds — no data yet. Muted surface tones with a hint of the
   brand accent so the page reads as a real dashboard skeleton. */

function BarsPlaceholder() {
  const bars = [40, 66, 30, 82, 54, 70, 46, 60]
  return (
    <svg viewBox="0 0 300 120" width="100%" height="120" preserveAspectRatio="none" role="img" aria-label="bar chart placeholder">
      {bars.map((h, i) => (
        <rect key={i} x={8 + i * 36} y={112 - h} width={24} height={h} rx={3} fill="var(--panel-2)" stroke="var(--border)" />
      ))}
      <line x1="4" y1="112" x2="296" y2="112" stroke="var(--border)" />
    </svg>
  )
}

function LinePlaceholder() {
  return (
    <svg viewBox="0 0 300 120" width="100%" height="120" preserveAspectRatio="none" role="img" aria-label="line chart placeholder">
      <polyline
        points="8,92 48,70 88,80 128,44 168,58 208,32 248,44 292,26"
        fill="none"
        stroke="var(--primary)"
        strokeOpacity="0.55"
        strokeWidth="2"
      />
      <line x1="4" y1="112" x2="296" y2="112" stroke="var(--border)" />
    </svg>
  )
}

function DonutPlaceholder() {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="120" role="img" aria-label="donut chart placeholder">
      <circle cx="60" cy="60" r="42" fill="none" stroke="var(--panel-2)" strokeWidth="18" />
      <circle
        cx="60"
        cy="60"
        r="42"
        fill="none"
        stroke="var(--primary)"
        strokeOpacity="0.55"
        strokeWidth="18"
        strokeDasharray="150 400"
        transform="rotate(-90 60 60)"
      />
    </svg>
  )
}

type ChartKind = 'bars' | 'line' | 'donut'

function Chart({ kind }: { kind: ChartKind }) {
  if (kind === 'line') return <LinePlaceholder />
  if (kind === 'donut') return <DonutPlaceholder />
  return <BarsPlaceholder />
}

function ChartCard({ title, kind }: { title: string; kind: ChartKind }) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
      <Chart kind={kind} />
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Placeholder — not yet wired to data</div>
    </div>
  )
}

function Kpi({ label }: { label: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="label">{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--muted)', lineHeight: 1.1 }}>—</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>{title}</h2>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {children}
      </div>
    </section>
  )
}

const KPIS = ['Open RFPs', 'CRM firms', 'Municipalities tracked', 'Fundraising pipeline', 'PlayGM DAU']

const SECTIONS: { title: string; cards: { title: string; kind: ChartKind }[] }[] = [
  {
    title: 'CRM & Pipeline',
    cards: [
      { title: 'RFPs by state', kind: 'bars' },
      { title: 'RFPs by tier', kind: 'donut' },
      { title: 'CRM firms by category', kind: 'bars' },
      { title: 'Upcoming RFP deadlines', kind: 'line' },
    ],
  },
  {
    title: 'Fundraising',
    cards: [
      { title: 'Pipeline by stage', kind: 'bars' },
      { title: 'Committed vs. target', kind: 'donut' },
      { title: 'Commitments over time', kind: 'line' },
    ],
  },
  {
    title: 'OpenDocket / Municipal',
    cards: [
      { title: 'Municipalities by state', kind: 'donut' },
      { title: 'Meetings ingested over time', kind: 'line' },
      { title: 'Agenda items by section', kind: 'bars' },
      { title: 'Board members by body', kind: 'bars' },
    ],
  },
  {
    title: 'Circular',
    cards: [
      { title: 'Investor pipeline by stage', kind: 'bars' },
      { title: 'Deal-room engagement', kind: 'line' },
    ],
  },
  {
    title: 'PlayGM',
    cards: [
      { title: 'DAU / MAU', kind: 'line' },
      { title: 'Revenue by source', kind: 'bars' },
      { title: 'Card packs opened', kind: 'bars' },
    ],
  },
]

export default async function AnalyticsDashboardPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login')

  const today = etDate()
  const [briefing, fitnessState] = await Promise.all([
    getLatestBriefing().catch(() => null),
    getFitnessState(today).catch(() => ({})),
  ])
  const fitnessItems =
    briefing?.fitness && briefing.fitness.length > 0 ? briefing.fitness : DEFAULT_FITNESS_ITEMS

  return (
    <div className="container">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORDMARK} alt="Remix Properties" style={{ height: 34, display: 'block' }} />
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Dashboard · Signed in as {session.name}
          </div>
        </div>
        <AdminNav />
      </header>

      <TodayPanel
        date={today}
        updatedAt={briefing?.updatedAt ?? null}
        markdown={briefing?.markdown ?? null}
        fitness={fitnessItems}
        initialState={fitnessState}
      />

      <h1 className="page-title">Analytics</h1>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 20px', maxWidth: 720 }}>
        Cross-section overview. These charts are placeholders — the layout is ready to wire up to
        live metrics from each subsection (CRM, OpenDocket, Circular, PlayGM).
      </p>

      {/* KPI row */}
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          marginBottom: 28,
        }}
      >
        {KPIS.map((k) => (
          <Kpi key={k} label={k} />
        ))}
      </div>

      {SECTIONS.map((s) => (
        <Section key={s.title} title={s.title}>
          {s.cards.map((c) => (
            <ChartCard key={c.title} title={c.title} kind={c.kind} />
          ))}
        </Section>
      ))}
    </div>
  )
}
