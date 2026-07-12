/**
 * Short editorial "town background" copy — history / economy / key industries
 * / character — shown above the jurisdiction map on the dashboard, plus a
 * companion illustrated carousel. Committed static data (no DB dependency).
 *
 * Facts drawn from the town's own history pages and public reporting on its
 * two anchor employers; see each section's citation in code review, not
 * rendered inline (this is a dashboard blurb, not a footnoted article).
 */

export interface BackgroundSection {
  key: string
  label: string
  icon: string
  text: string
}

export interface CarouselSlide {
  key: string
  icon: string
  caption: string
  sub: string
  /** Photo URL. Hotlinked from third-party CDNs — if one ever breaks, the
   *  carousel falls back to the gradient + icon panel below rather than
   *  showing a broken image. */
  img?: string
  /** CSS gradient stops — the fallback background (and the only background
   *  when no img is set), kept as plain hex so the panel reads the same in
   *  both the dark Remix theme and the light OpenNorthCastle skin. */
  from: string
  to: string
}

export interface TownBackground {
  muniKey: string
  sections: BackgroundSection[]
  slides: CarouselSlide[]
}

const NORTH_CASTLE: TownBackground = {
  muniKey: 'nc',
  sections: [
    {
      key: 'history',
      label: 'History',
      icon: '🏛️',
      text:
        'North Castle held its first town meeting on April 6, 1736, and was formally incorporated in 1788. ' +
        'The name descends from a Siwanoy stronghold — "North Fort" — that once stood on the hillside now ' +
        'occupied by IBM’s headquarters. New Castle split off as its own town in 1791, leaving North Castle ' +
        'its present three hamlets: Armonk, Banksville and North White Plains.',
    },
    {
      key: 'economy',
      label: 'Economy',
      icon: '💼',
      text:
        'A high-value, low-density tax base: large corporate campuses and executive housing anchor the grand ' +
        'list rather than dense commercial strips. Armonk’s hamlet center carries most of the town’s ' +
        'retail and dining, and the town leans on grants and cost-sharing to fund capital work without pushing ' +
        'up the levy.',
    },
    {
      key: 'industries',
      label: 'Key industries',
      icon: '🏢',
      text:
        'IBM has run its world headquarters from a 432-acre former apple orchard in Armonk since 1964. Swiss ' +
        'Re has based its U.S. reinsurance operations there since 1999. Beyond the corporate campuses, the ' +
        'economy leans on professional services, equestrian and agricultural land, and Metro-North commuter ' +
        'households working in Manhattan.',
    },
    {
      key: 'character',
      label: 'Character',
      icon: '🌳',
      text:
        'Rolling, wooded terrain threaded by the Bedford Road corridor and the Kensico Reservoir watershed. ' +
        'Byram Hills Central School District serves most of the town; North White Plains and Banksville fall ' +
        'into neighboring districts.',
    },
  ],
  slides: [
    {
      key: 'armonk-square', icon: '🏘️', caption: 'Armonk hamlet center', sub: 'Armonk Square, Main Street',
      img: 'https://www.ragette.com/thumbs/800x600/r/uploads/Armonk%20Square.PNG',
      from: '#2563d6', to: '#01068b',
    },
    {
      key: 'ibm-hq', icon: '🏢', caption: 'IBM World Headquarters', sub: 'Armonk, since 1964',
      img: 'https://azahner.com/wp-content/uploads/2025/11/ibm-world-headquarters-c-zahner-6058.jpg',
      from: '#01068b', to: '#141a3d',
    },
    {
      key: 'wampus-brook', icon: '🌳', caption: 'Wampus Brook Park', sub: 'Parks & preserves',
      img: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0d/5b/cb/03/wampas-brook-pond-armonk.jpg?w=1400&h=-1&s=1',
      from: '#84cc16', to: '#3f6b0a',
    },
    {
      key: 'fol-de-rol', icon: '🎪', caption: 'Armonk Fol-De-Rol', sub: "The town's annual street fair",
      img: 'https://www.whattododigital.com/wp-content/uploads/2023/05/Armonk-Fol-De-Rol-e1684245819723-960x640.jpg',
      from: '#c7913c', to: '#8a5f1f',
    },
    {
      key: 'art-show', icon: '🎨', caption: 'Armonk Outdoor Art Show', sub: 'Community arts & culture',
      img: 'https://armonkoutdoorartshow.org/wp-content/uploads/2023/10/Experience-the-show-2-960x720.jpeg',
      from: '#3d9c72', to: '#1f5c42',
    },
  ],
}

const TOWN_BACKGROUND: Record<string, TownBackground> = {
  nc: NORTH_CASTLE,
}

export function getTownBackground(muniKey: string): TownBackground | null {
  return TOWN_BACKGROUND[muniKey] ?? null
}
