'use client'

/**
 * Admin → Dashboard
 *
 * Government RFP / consulting opportunities sourced from the NYS Contract
 * Reporter (nyscr.ny.gov), matched against Stefan's CRE-development and
 * PropTech profiles. Self-contained: opportunity data lives in OPPORTUNITIES
 * below so the page renders with no backend wiring. To refresh the list,
 * edit that array (or later wire it to /api/admin/opportunities).
 */

import { useMemo, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { ExternalLink, AlertTriangle, Map as MapIcon } from 'lucide-react'

type Tier = 'A' | 'B' | 'C'

interface Opportunity {
  tier: Tier
  title: string
  agency: string
  cr: string
  due: string // ISO date, or '' if rolling
  dueLabel: string
  city: string
  rationale: string
}

const NYSCR = (cr: string) =>
  `https://www.nyscr.ny.gov/Ads/Search?Status=Open&Keyword=${cr}`

const OPPORTUNITIES: Opportunity[] = [
  {
    tier: 'A',
    title: 'Economic Development Services — Consultant Pool (RFQ)',
    agency: 'Empire State Development',
    cr: '2136655',
    due: '2026-08-28',
    dueLabel: '8/28/2026',
    city: 'Statewide NY',
    rationale:
      'Direct fit: site-selection & economic-development background plus advisory practice. Qualified-vendor pool = recurring task-order work once admitted.',
  },
  {
    tier: 'A',
    title: 'Student Housing Development — Ground Lease, SUNY ESF (RFI)',
    agency: 'SUNY System Administration',
    cr: '2136174',
    due: '2026-07-22',
    dueLabel: '7/22/2026',
    city: 'Syracuse, NY',
    rationale:
      'A development / ground-lease play (not a consulting RFP) — closest to the Remix / mixed-use developer profile. Pursue as principal or advisor to a development team.',
  },
  {
    tier: 'A',
    title: 'Business Consulting Services',
    agency: 'NYS Office of General Services',
    cr: '2133780',
    due: '2026-07-07',
    dueLabel: '7/7/2026',
    city: 'Albany, NY',
    rationale:
      'Broad statewide consulting vehicle — position strategy / underwriting / asset-management advisory.',
  },
  {
    tier: 'A',
    title: 'Land Lease & Development Opportunities for Energy Storage (RFQ)',
    agency: 'Power Authority of New York',
    cr: '2136537',
    due: '',
    dueLabel: 'Rolling — through 6/24/2028',
    city: 'Statewide NY',
    rationale:
      'Land assemblage / ground-lease development structuring. Aligns with land-assemblage and deal-structuring experience. Rolling deadline.',
  },
  {
    tier: 'B',
    title: 'Disadvantaged Communities Consultant Pool',
    agency: 'NYSERDA',
    cr: '2125864',
    due: '2026-12-31',
    dueLabel: '12/31/2026',
    city: 'Statewide NY',
    rationale:
      'Consultant pool spanning planning / community development. Low-pressure deadline; builds a state credential.',
  },
  {
    tier: 'B',
    title: 'Smart Growth Community Planning Program',
    agency: 'NYS Dept. of State',
    cr: '2135699',
    due: '2026-07-31',
    dueLabel: '7/31/2026',
    city: 'Statewide NY',
    rationale:
      'Land-use / smart-growth planning — adjacent to entitlements and mixed-use development.',
  },
  {
    tier: 'B',
    title: 'Brownfield Opportunity Area Program',
    agency: 'NYS Dept. of State',
    cr: '2135693',
    due: '2026-07-31',
    dueLabel: '7/31/2026',
    city: 'Statewide NY',
    rationale:
      'Brownfield redevelopment planning — site repositioning and adaptive reuse.',
  },
  {
    tier: 'B',
    title: 'Transportation Planning Platform',
    agency: 'Niagara Frontier Transportation Authority',
    cr: '2136625',
    due: '2026-07-21',
    dueLabel: '7/21/2026',
    city: 'Buffalo, NY',
    rationale:
      'Location / planning data platform — closest match to the Placer.ai / Remix location-intelligence profile.',
  },
  {
    tier: 'B',
    title: 'Pre-Qualified IT Goods & Services',
    agency: 'Empire State Development',
    cr: '2136510',
    due: '2026-08-07',
    dueLabel: '8/7/2026',
    city: 'Statewide NY',
    rationale:
      'IT vendor pre-qualification — entry point to position a PropTech / data-tooling offering to the state.',
  },
  {
    tier: 'C',
    title: 'Schroon Unified Zoning & Development Code',
    agency: 'Essex County',
    cr: '2135547',
    due: '2026-06-30',
    dueLabel: '6/30/2026',
    city: 'Schroon Lake, NY',
    rationale:
      'Zoning / development-code work; relevant to entitlements experience but deadline imminent.',
  },
  {
    tier: 'C',
    title: 'Just Transition Site Reuse Planning',
    agency: 'NYSERDA',
    cr: '2078045',
    due: '2026-06-30',
    dueLabel: '6/30/2026',
    city: 'Statewide NY',
    rationale: 'Site reuse / repositioning planning. Deadline imminent.',
  },
  {
    tier: 'C',
    title: 'Asset Management Software (RFP)',
    agency: 'Empire State Development',
    cr: '2136198',
    due: '2026-07-17',
    dueLabel: '7/17/2026',
    city: 'Statewide NY',
    rationale:
      'Software-oriented, but asset-management + analytics background gives domain credibility (partner / advisor angle).',
  },
  {
    tier: 'C',
    title: 'Real Property Appraisal Services',
    agency: 'NYS Dept. of Tax & Finance',
    cr: '2133427',
    due: '2026-07-09',
    dueLabel: '7/9/2026',
    city: 'Albany, NY',
    rationale:
      'RE valuation work; specialized utility/telecom property likely needs a licensed-appraiser partner.',
  },
]

const TIER_VARIANT: Record<Tier, 'default' | 'secondary' | 'outline'> = {
  A: 'default',
  B: 'secondary',
  C: 'outline',
}

function daysUntil(iso: string): number | null {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(iso + 'T00:00:00')
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

export default function OpportunitiesDashboardPage() {
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return OPPORTUNITIES.filter((o) => {
      if (tier !== 'all' && o.tier !== tier) return false
      if (!q) return true
      return (
        o.title.toLowerCase().includes(q) ||
        o.agency.toLowerCase().includes(q) ||
        o.rationale.toLowerCase().includes(q) ||
        o.cr.includes(q)
      )
    }).sort((a, b) => {
      if (a.tier !== b.tier) return a.tier.localeCompare(b.tier)
      const da = a.due || '9999-12-31'
      const db = b.due || '9999-12-31'
      return da.localeCompare(db)
    })
  }, [query, tier])

  const counts = useMemo(() => {
    const byTier = { A: 0, B: 0, C: 0 } as Record<Tier, number>
    let closingSoon = 0
    for (const o of OPPORTUNITIES) {
      byTier[o.tier]++
      const d = daysUntil(o.due)
      if (d !== null && d >= 0 && d <= 14) closingSoon++
    }
    return { total: OPPORTUNITIES.length, byTier, closingSoon }
  }, [])

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Opportunities Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Government RFP &amp; consulting opportunities from the NYS Contract
            Reporter, matched to the firm&apos;s development and PropTech
            profiles.
          </p>
        </div>
        <Link
          href="/admin/atlas"
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <MapIcon className="size-4" />
          Open Atlas
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total open</CardDescription>
            <CardTitle className="text-3xl">{counts.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tier A (strongest fit)</CardDescription>
            <CardTitle className="text-3xl">{counts.byTier.A}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tier B</CardDescription>
            <CardTitle className="text-3xl">{counts.byTier.B}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Closing &le; 14 days</CardDescription>
            <CardTitle className="text-3xl">{counts.closingSoon}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search title, agency, CR#…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="A">Tier A</SelectItem>
            <SelectItem value="B">Tier B</SelectItem>
            <SelectItem value="C">Tier C</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {filtered.length} shown
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Tier</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="hidden lg:table-cell">Why it fits</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => {
                const d = daysUntil(o.due)
                const urgent = d !== null && d >= 0 && d <= 14
                const past = d !== null && d < 0
                return (
                  <TableRow key={o.cr}>
                    <TableCell>
                      <Badge variant={TIER_VARIANT[o.tier]}>{o.tier}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {o.title}
                      <div className="text-xs text-muted-foreground">
                        CR# {o.cr} · {o.city}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{o.agency}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <span className="inline-flex items-center gap-1">
                        {urgent && (
                          <AlertTriangle className="size-3.5 text-orange-500" />
                        )}
                        <span
                          className={
                            past
                              ? 'text-muted-foreground line-through'
                              : urgent
                                ? 'font-medium text-orange-600'
                                : ''
                          }
                        >
                          {o.dueLabel}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-md text-xs text-muted-foreground lg:table-cell">
                      {o.rationale}
                    </TableCell>
                    <TableCell>
                      <a
                        href={NYSCR(o.cr)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                        aria-label="Open on NYS Contract Reporter"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Source: NYS Contract Reporter (nyscr.ny.gov). Full ad text, contacts, and
        documents require an NYSCR login. Links filter the site to each CR#.
      </p>
    </div>
  )
}
