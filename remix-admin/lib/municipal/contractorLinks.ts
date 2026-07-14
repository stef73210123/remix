/**
 * Official websites for the contractors that show up most often in North
 * Castle's permit records, so "Most active contractors" can link a name
 * straight to the business. Verified by name + Westchester-area address
 * match; contractors we couldn't confidently verify (e.g. "Hi-End Builders
 * Inc", "SILA LLC") are left unlinked rather than guessed.
 *
 * Kept in its own client-safe module (no fs/path) so importing it doesn't
 * pull permits.ts's Node-only file reads into the browser bundle.
 */
const CONTRACTOR_WEBSITES: Record<string, string> = {
  'Burke Energy': 'https://www.burkeenergy.com/',
  'Heritage Fuel Inc.': 'https://www.heritagefuel.com/',
  'Heritage Propane': 'https://www.heritagefuel.com/',
  'Innov8tive Environmental Services Inc.': 'https://www.innov8enviro.com/',
  'Durkin Propane': 'https://www.durkinpropane.com/',
  'Halstead - Quinn Petroleum': 'https://www.hqpetroleum.com/',
  'Dandelion Energy': 'https://dandelionenergy.com/',
  'Prime Building Services Inc Mel Orellana': 'https://primehomeimprovement.com/',
  'Infinity Solar System Jason Monforte': 'https://thenewutility.com/',
  'Icon Remodeling Group Inc': 'https://icon-remodeling-group-inc.business.site/',
}

export function getContractorWebsite(name: string): string | undefined {
  return CONTRACTOR_WEBSITES[name]
}
