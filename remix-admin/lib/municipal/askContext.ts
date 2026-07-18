/**
 * Context bundle fed to the "Ask" assistant (AskLightbox.tsx via
 * app/admin/api/municipal/ask) — a compact, server-assembled digest of the
 * same public data already surfaced elsewhere on the site (key issues,
 * department contacts, the 2026 adopted budget), so the assistant answers
 * from real committed data instead of an open-ended model guess. Kept as
 * plain text (not a raw JSON dump) since that's both cheaper in tokens and
 * easier for the model to quote from directly.
 */
import { findMunicipality } from './registry'
import { getKeyIssues } from './keyIssues'
import { getBoardDepartments } from './departments'
import { DEPT_PAGES } from './deptPages'
import {
  NC_2026_APPROPRIATIONS,
  NC_HOMEOWNER_TAX_IMPACT,
  NC_TAX_CAP_WATERFALL,
  NC_2026_BUDGET_SOURCE_NOTE,
} from './budget2026'

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

// Every bodyKey departments.ts has contacts for, plus the two page kinds
// (building/finance) that aren't registry "bodies" — getBoardDepartments
// returns [] for any key it doesn't recognize, so listing ones that don't
// resolve yet (e.g. zba/arb) is harmless.
const CONTACT_BODY_KEYS = [
  'town_board', 'planning', 'zba', 'arb', 'conservation', 'open_space', 'parks_rec',
  'building', 'finance', 'highway',
  ...DEPT_PAGES.map((d) => d.key),
]

export function buildAskContext(muniKey: string): string {
  const muni = findMunicipality(muniKey)
  if (!muni) return `No data is on file for a municipality with key "${muniKey}".`

  const lines: string[] = []
  lines.push(`Town: ${muni.name}${muni.county ? `, ${muni.county} County` : ''}, ${muni.state}.`)

  lines.push('')
  lines.push('BOARDS & COMMITTEES:')
  for (const b of muni.bodies) {
    lines.push(`- ${b.displayName}${b.meetingPattern ? ` — meets ${b.meetingPattern}` : ''}`)
  }

  lines.push('')
  lines.push('DEPARTMENT / BOARD CONTACTS:')
  const seen = new Set<string>()
  for (const key of CONTACT_BODY_KEYS) {
    for (const c of getBoardDepartments(muniKey, key)) {
      const id = `${c.department}|${c.person ?? ''}`
      if (seen.has(id)) continue
      seen.add(id)
      const who = [c.department, c.person ? `— ${c.person}` : '', c.title ? `(${c.title})` : ''].filter(Boolean).join(' ')
      const reach = [c.phone, c.email].filter(Boolean).join(', ')
      lines.push(`- ${who}${reach ? `: ${reach}` : ''} — ${c.blurb}`)
    }
  }

  if (muniKey === 'nc') {
    const issues = getKeyIssues(muniKey)
    if (issues && issues.cards.length) {
      lines.push('')
      lines.push('RECURRING CIVIC ISSUES (from analysis of Town Board & Planning Board meeting transcripts):')
      for (const c of issues.cards) {
        lines.push(`- ${c.title}: ${c.insight} Evidence: ${c.evidence}`)
      }
    }

    lines.push('')
    lines.push('2026 ADOPTED BUDGET, by fund:')
    for (const a of NC_2026_APPROPRIATIONS) {
      lines.push(`- ${a.fund} (${a.category}): appropriation ${fmt(a.appropriation)}, tax levy ${fmt(a.taxLevy)}`)
    }
    const totalApprop = NC_2026_APPROPRIATIONS.reduce((s, a) => s + a.appropriation, 0)
    const totalLevy = NC_2026_APPROPRIATIONS.reduce((s, a) => s + a.taxLevy, 0)
    const override = NC_TAX_CAP_WATERFALL.find((s) => s.label.startsWith('Override'))
    const finalLevy = NC_TAX_CAP_WATERFALL[NC_TAX_CAP_WATERFALL.length - 1]
    lines.push(`- TOTAL across all funds: appropriation ${fmt(totalApprop)}, tax levy ${fmt(totalLevy)}`)
    lines.push(`- ${finalLevy.label}: ${fmt(finalLevy.value)}${override ? `, including a voter-approved override of ${fmt(override.value)} above the state tax cap` : ''}`)
    lines.push(
      `- Town-tax impact on the median (${fmt(NC_HOMEOWNER_TAX_IMPACT.medianHomeValue)}) home: ` +
      `${fmt(NC_HOMEOWNER_TAX_IMPACT.townTaxes2025)} in 2025 → ${fmt(NC_HOMEOWNER_TAX_IMPACT.townTaxes2026)} in 2026 ` +
      `(+${fmt(NC_HOMEOWNER_TAX_IMPACT.increase)}, +${(NC_HOMEOWNER_TAX_IMPACT.increasePct * 100).toFixed(1)}%)`,
    )
    lines.push(`- ${NC_2026_BUDGET_SOURCE_NOTE}`)
  }

  lines.push('')
  lines.push(
    'WHAT ELSE IS ON THE SITE (point residents to the relevant tab for anything this summary doesn\'t cover): ' +
    'meeting-by-meeting summaries and votes for the Town Board and Planning Board, sourced from the Town\'s own ' +
    'recordings; a searchable map and list of every building permit and land-use application; the full tax parcel ' +
    'roll with an interactive tax-bill estimator; a roads-by-jurisdiction map; election results; a community events ' +
    'calendar and local organization directory; and local news coverage.',
  )

  return lines.join('\n')
}
