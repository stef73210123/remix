/**
 * "In the news" — a curated roundup of local news coverage of the town and
 * its hamlets, distinct from the town's own announcements (departments.ts)
 * or meeting-transcript analysis. Hand-researched from outlets that actually
 * cover North Castle (The Examiner News, Westfair Communications, lohud/The
 * Journal News, Daily Voice), not a live feed — town/county/school news wires
 * carry a lot of noise (corporate earnings for unrelated companies that
 * happen to share a name, syndicated wire stories, etc.) that a keyword feed
 * would need to filter anyway, so this stays a periodically-refreshed,
 * verified list like the rest of the static municipal data files.
 */

export interface NewsItem {
  key: string
  title: string
  source: string
  url: string
  summary: string
  tag: string
}

const NEWS: Record<string, NewsItem[]> = {
  nc: [
    {
      key: 'town-hall-residents-question',
      title: "Residents Question North Castle's Town Hall Plan",
      source: 'The Examiner News',
      url: 'https://www.theexaminernews.com/residents-question-north-castles-town-hall-plan/',
      summary: 'More than 15 speakers at a public hearing pressed the Town Board over the cost of buying the Boies Schiller Flexner building at 333 Main St. and using eminent domain to make it the new Town Hall.',
      tag: 'Town Hall',
    },
    {
      key: 'town-hall-rfei',
      title: 'North Castle Seeks Developer Interest for a Project That Includes a New Town Hall',
      source: 'Westfair Communications',
      url: 'https://westfaironline.com/combined/north-castle-seeks-developer-interest-for-a-project-that-includes-a-new-town-hall/',
      summary: 'The town issued a Request for Expressions of Interest inviting developers to reimagine the Town Hall properties at 15, 17 and 21 Bedford Rd. in Armonk, potentially combining new municipal facilities with residential or commercial uses.',
      tag: 'Town Hall',
    },
    {
      key: 'armonk-square-approved',
      title: 'North Castle Planning Board Approves Armonk Square',
      source: 'The Examiner News',
      url: 'https://www.theexaminernews.com/7827/',
      summary: 'The Planning Board unanimously granted final approval to Armonk Square, a roughly 53,000-square-foot mixed-use building anchored by a 20,000-square-foot DeCicco Family Market with retail, office space and 10 apartments.',
      tag: 'Development',
    },
    {
      key: 'restaurant-conditional-approval',
      title: 'North Castle Grants Conditional Approval for New Armonk Restaurant',
      source: 'The Examiner News',
      url: 'https://www.theexaminernews.com/north-castle-grants-conditional-approval-for-new-armonk-restaurant/',
      summary: 'By a 4-1 vote, the Planning Board conditionally approved the 144-seat Wren of the Woods restaurant for 12 Maple Ave. after months of negotiation over downtown parking.',
      tag: 'Business',
    },
    {
      key: 'restaurant-parking',
      title: 'North Castle Officials Force Armonk Restaurant Plan to Address Parking',
      source: 'The Examiner News',
      url: 'https://www.theexaminernews.com/north-castle-officials-force-armonk-restaurant-plan-to-address-parking/',
      summary: 'Planning Board members required the Wren of the Woods restaurant proposal to resolve downtown parking concerns before the project could move toward approval.',
      tag: 'Business',
    },
    {
      key: 'sewer-plant-upgrade',
      title: 'North Castle Moves Ahead to Upgrade Sewer Plant for Downtown Armonk',
      source: 'The Examiner News',
      url: 'https://www.theexaminernews.com/north-castle-moves-ahead-to-upgrade-sewer-plant-for-downtown-armonk/',
      summary: "The town authorized a roughly $4.5 million upgrade to the wastewater treatment plant serving downtown Armonk's sewer district, opting for the improvement over a costlier plant expansion.",
      tag: 'Infrastructure',
    },
    {
      key: 'hotel-townhouse-zoning',
      title: 'North Castle Approves Zoning for Hotel, Townhouse Project',
      source: 'The Examiner News',
      url: 'https://www.theexaminernews.com/north-castle-approves-zoning-for-hotel-townhouse-project/',
      summary: 'The Town Board approved zoning changes clearing the way for a proposed hotel and townhouse development.',
      tag: 'Zoning',
    },
    {
      key: 'residential-project-approvals',
      title: 'Armonk Residential Project Receives Approvals from North Castle',
      source: 'Westfair Communications',
      url: 'https://westfaironline.com/combined/armonk-residential-project-receives-approvals-from-north-castle/',
      summary: 'A residential development in Armonk received approvals from North Castle officials.',
      tag: 'Development',
    },
  ],
}

/** Curated local news coverage for a town, or [] if none tracked. */
export function getNewsItems(muniKey: string): NewsItem[] {
  return NEWS[muniKey] ?? []
}
