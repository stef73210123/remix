/**
 * Key-issue "playbook" cards — a narrative synopsis of a town's recurring civic
 * issues, shown above the sorted theme charts. Each card pairs a plain-language
 * INSIGHT with concrete EVIDENCE drawn from the committed transcript analysis
 * (theme volumes, sentiment, and notable cases across the Town Board and
 * Planning Board). Committed static data so it renders with no DB dependency.
 */

export interface KeyIssueCard {
  n: number
  title: string
  icon: string
  insight: string
  evidence: string
}

export interface TownKeyIssues {
  muniKey: string
  cards: KeyIssueCard[]
}

const KEY_ISSUES: Record<string, TownKeyIssues> = {
  nc: {
    muniKey: 'nc',
    cards: [
      {
        n: 1,
        title: 'Open government & procedure',
        icon: '🏛️',
        insight:
          'The board spends more time on process, transparency and proper procedure than on any other single topic — a sensitivity heightened after the 2023 supervisor race decided by roughly four votes.',
        evidence:
          'Open government & procedure surfaced in 43 Town Board meetings — the most-discussed theme — yet sits near-neutral (+0.8), reflecting unresolved tension over how decisions get made rather than what they are.',
      },
      {
        n: 2,
        title: 'Water & sewer districts',
        icon: '💧',
        insight:
          'District infrastructure is a steady, broadly supported priority, with capital work funded largely through the districts and outside grants rather than the general tax levy.',
        evidence:
          'Water & sewer district business came up in 37 meetings at a favorable +5.0, alongside a strong grants & capital-projects track (35 meetings, +4.6).',
      },
      {
        n: 3,
        title: 'Land use, zoning & development',
        icon: '🏗️',
        insight:
          'Development pressure concentrates on a few sizable applications, with the board weighing tax base and housing supply against neighborhood character.',
        evidence:
          'The Ferrari Companies petition to rezone 333 Main Street for residential use was referred; the Gateway development received a one-year special-permit extension; and the RCLA "Enclave at Armonk" (113 King Street, Toll) was approved.',
      },
      {
        n: 4,
        title: 'Environment: wetlands, trees & stormwater',
        icon: '🌲',
        insight:
          'Nearly every Planning Board application is scrutinized through an environmental lens — wetland buffers, tree screening and drainage are the dominant filters on new construction.',
        evidence:
          'Wetlands & buffers (45 meetings), tree removal & screening (41) and stormwater & drainage (39) are the three most-discussed planning topics; steep-slope and rock-removal reviews trend negative (−0.8).',
      },
      {
        n: 5,
        title: 'Public safety & police',
        icon: '🚓',
        insight:
          'Police staffing and public safety draw strong, consistent support, and the board has prioritized reaching budgeted staffing levels.',
        evidence:
          'Public safety & police featured in 35 meetings at a favorable +5.0, including officer swearing-in and staffing actions backing the department.',
      },
      {
        n: 6,
        title: 'Fiscal responsibility: budget & taxes',
        icon: '💵',
        insight:
          'Disciplined budgeting is a throughline: leadership leans on grants and cost-sharing to fund projects without pushing up the tax levy.',
        evidence:
          '37 meetings addressed budget, taxes & finance; the grants & capital-projects theme (35 meetings, +4.6) repeatedly offset town costs.',
      },
    ],
  },
}

export function getKeyIssues(muniKey: string): TownKeyIssues | null {
  return KEY_ISSUES[muniKey] ?? null
}
