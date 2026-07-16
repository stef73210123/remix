/**
 * Local community organizations — the civic/cultural groups a resident deals
 * with day to day, distinct from Town government itself (departments.ts) and
 * from the community events they run (events.ts). Static, committed info,
 * like the rest of the municipal data files, so it renders with no DB
 * dependency.
 */

export interface CommunityOrg {
  key: string
  name: string
  blurb: string
  address?: string
  phone?: string
  email?: string
  website: string
  websiteLabel: string
}

const ORGS: Record<string, CommunityOrg[]> = {
  nc: [
    {
      key: 'library',
      name: 'North Castle Public Library',
      blurb: 'The town\'s public library, serving Armonk and North White Plains with two branches under one card.',
      address: '19 Whippoorwill Road East, Armonk, NY 10504',
      phone: '(914) 273-3887',
      website: 'https://www.northcastlelibrary.org/',
      websiteLabel: 'northcastlelibrary.org',
    },
    {
      key: 'chamber',
      name: 'Armonk Chamber of Commerce',
      blurb: 'Business association behind Armonk\'s downtown events — Music in the Square, the Gazebo concert series, and Frosty Day.',
      address: 'P.O. Box 24, Armonk, NY 10504',
      phone: '(914) 273-2353',
      email: 'president@armonkchamberofcommerce.com',
      website: 'https://www.armonkchamberofcommerce.com/',
      websiteLabel: 'armonkchamberofcommerce.com',
    },
    {
      key: 'art-show',
      name: 'Armonk Outdoor Art Show',
      blurb: 'Annual juried outdoor art show held every September in downtown Armonk, run by the Friends of the North Castle Public Library as its signature fundraiser.',
      address: '19 Whippoorwill Road East, Armonk, NY 10504',
      phone: '(914) 273-9706',
      email: 'info@armonkoutdoorartshow.org',
      website: 'https://armonkoutdoorartshow.org/',
      websiteLabel: 'armonkoutdoorartshow.org',
    },
    {
      key: 'friends-of-frosty',
      name: 'Friends of Frosty',
      blurb: 'Volunteer nonprofit that organizes Armonk\'s annual Frosty Day parade and the "Help Frosty Help Others" winter-coat drive.',
      website: 'https://www.armonkfrosty.com/',
      websiteLabel: 'armonkfrosty.com',
    },
    {
      key: 'lions-club',
      name: 'Armonk Lions Club',
      blurb: 'Community service organization behind the annual Fol-De-Rol Fair at Wampus Brook Park, plus local service and charitable projects.',
      address: 'P.O. Box 211, Armonk, NY 10504',
      phone: '(917) 498-5793',
      website: 'https://www.armonklionsclub.org/',
      websiteLabel: 'armonklionsclub.org',
    },
    {
      key: 'historical-society',
      name: 'North Castle Historical Society',
      blurb: 'Keeper of the town\'s history, based in the landmarked Smith\'s Tavern — local archives, exhibits, and school programs.',
      address: '440 Bedford Road, Armonk, NY 10504',
      phone: '(914) 273-4510',
      email: 'NorthCastleHistoricalSociety@gmail.com',
      website: 'https://www.northcastlehistoricalsociety.org/',
      websiteLabel: 'northcastlehistoricalsociety.org',
    },
  ],
}

/** Community organizations for a town, or [] if none tracked. */
export function getCommunityOrgs(muniKey: string): CommunityOrg[] {
  return ORGS[muniKey] ?? []
}
