/**
 * Open resident petitions relevant to the town — distinct from the civic
 * organizations (orgs.ts) and events (events.ts) files. Static, committed
 * info, like the rest of the municipal data files, so it renders with no DB
 * dependency.
 */

export interface Petition {
  key: string
  title: string
  summary: string
  link: string
  linkLabel: string
}

const PETITIONS: Record<string, Petition[]> = {
  nc: [
    {
      key: 'zoning-reform',
      title: 'North Castle Zoning Reform',
      summary: 'A resident-led petition on zoning reform in the Town of North Castle.',
      link: 'https://armonk.info',
      linkLabel: 'armonk.info',
    },
  ],
}

/** Open petitions for a town, or [] if none tracked. */
export function getPetitions(muniKey: string): Petition[] {
  return PETITIONS[muniKey] ?? []
}
