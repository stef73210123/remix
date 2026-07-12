/**
 * Community events calendar for tracked municipalities — town fairs, concert
 * series, and civic celebrations (distinct from the board/committee Meetings
 * timeline elsewhere in the dashboard). Committed static data, like
 * elections.ts/departments.ts, so it renders with no DB dependency.
 *
 * Dates/times/locations are sourced from the organizing groups' own listings
 * (Armonk Lions Club, Armonk Chamber of Commerce, Armonk Outdoor Art Show,
 * Friends of Frosty, North Castle Public Library, Byram Hills CSD); see each
 * event's `url`.
 */

export interface CommunityEvent {
  key: string
  title: string
  /** Start date, YYYY-MM-DD. */
  date: string
  /** Inclusive end date for multi-day events, YYYY-MM-DD. */
  endDate?: string
  /** 24h local time, e.g. '18:00'. Omit for an all-day/unspecified-time listing. */
  startTime?: string
  endTime?: string
  location: string
  description: string
  /** The organizer's own event page. */
  url: string
  category: 'festival' | 'market' | 'concert' | 'holiday' | 'civic'
}

const EVENTS: Record<string, CommunityEvent[]> = {
  nc: [
    {
      key: 'fol-de-rol-2026',
      title: 'Armonk Fol-De-Rol Country Fair',
      date: '2026-06-04',
      endDate: '2026-06-07',
      location: 'Wampus Elementary & Wampus Brook Park, Armonk',
      description:
        "The Armonk Lions Club's 50th annual Fol-De-Rol Fair — carnival rides, a car show, live music, " +
        'food vendors and a craft market. Rides & food: Jun 4–5, 6–10pm; Jun 6, noon–10pm; Jun 7, noon–6pm. ' +
        'Craft vendors: Jun 5 evening market, Jun 6, 11am–6pm; Jun 7, 11am–5pm.',
      url: 'https://www.armonklionsclub.org/fol-de-rol.html',
      category: 'festival',
    },
    {
      key: 'music-square-2026-06-24',
      title: 'Music in the Square',
      date: '2026-06-24',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Armonk Square, Main Street, Armonk',
      description: 'Free outdoor concert series in the heart of downtown Armonk, presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/town-events-calendar-copy/',
      category: 'concert',
    },
    {
      key: 'music-square-2026-07-01',
      title: 'Music in the Square',
      date: '2026-07-01',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Armonk Square, Main Street, Armonk',
      description: 'Free outdoor concert series in the heart of downtown Armonk, presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/town-events-calendar-copy/',
      category: 'concert',
    },
    {
      key: 'gazebo-2026-07-11',
      title: 'Summer Concert at the Gazebo',
      date: '2026-07-11',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Wampus Brook Park gazebo, Armonk',
      description: 'Free outdoor concert series at the Wampus Brook Park gazebo, presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/summer-concerts/',
      category: 'concert',
    },
    {
      key: 'gazebo-2026-07-18',
      title: 'Summer Concert at the Gazebo',
      date: '2026-07-18',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Wampus Brook Park gazebo, Armonk',
      description: 'Free outdoor concert series at the Wampus Brook Park gazebo, presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/summer-concerts/',
      category: 'concert',
    },
    {
      key: 'gazebo-2026-07-25',
      title: 'Summer Concert at the Gazebo',
      date: '2026-07-25',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Wampus Brook Park gazebo, Armonk',
      description: 'Free outdoor concert series at the Wampus Brook Park gazebo, presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/summer-concerts/',
      category: 'concert',
    },
    {
      key: 'gazebo-2026-08-01',
      title: 'Summer Concert at the Gazebo',
      date: '2026-08-01',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Wampus Brook Park gazebo, Armonk',
      description: 'Free outdoor concert series at the Wampus Brook Park gazebo, presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/summer-concerts/',
      category: 'concert',
    },
    {
      key: 'gazebo-2026-08-08',
      title: 'Summer Concert: New York’s Finest (John Fogerty Tribute)',
      date: '2026-08-08',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Wampus Brook Park gazebo, Armonk',
      description:
        'Closing night of the summer concert series at the Wampus Brook Park gazebo — a John Fogerty tribute set, ' +
        'presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/summer-concerts/',
      category: 'concert',
    },
    {
      key: 'music-square-2026-08-12',
      title: 'Music in the Square',
      date: '2026-08-12',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Armonk Square, Main Street, Armonk',
      description: 'Free outdoor concert series in the heart of downtown Armonk, presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/town-events-calendar-copy/',
      category: 'concert',
    },
    {
      key: 'music-square-2026-08-19',
      title: 'Music in the Square',
      date: '2026-08-19',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Armonk Square, Main Street, Armonk',
      description: 'Free outdoor concert series in the heart of downtown Armonk, presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/town-events-calendar-copy/',
      category: 'concert',
    },
    {
      key: 'music-square-2026-08-26',
      title: 'Music in the Square',
      date: '2026-08-26',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Armonk Square, Main Street, Armonk',
      description: 'Free outdoor concert series in the heart of downtown Armonk, presented by the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/town-events-calendar-copy/',
      category: 'concert',
    },
    {
      key: 'art-show-2026',
      title: 'Armonk Outdoor Art Show',
      date: '2026-09-26',
      endDate: '2026-09-27',
      startTime: '10:00',
      endTime: '17:00',
      location: 'Downtown Armonk',
      description:
        'The 64th annual Armonk Outdoor Art Show — roughly 160 exhibiting artists from across the country, ' +
        'rain or shine, 10am–5pm both days.',
      url: 'https://armonkoutdoorartshow.org/',
      category: 'festival',
    },
    {
      key: 'music-square-2026-09-16',
      title: 'Music in the Square',
      date: '2026-09-16',
      startTime: '18:00',
      endTime: '20:00',
      location: 'Armonk Square, Main Street, Armonk',
      description: 'Free outdoor concert series in the heart of downtown Armonk, presented by the Armonk Chamber of Commerce — season closer.',
      url: 'https://www.armonkchamberofcommerce.com/town-events-calendar-copy/',
      category: 'concert',
    },
    {
      key: 'frosty-day-2026',
      title: 'Frosty Day & Parade',
      date: '2026-12-05',
      startTime: '12:00',
      endTime: '17:00',
      location: 'Downtown Armonk',
      description:
        'Holiday festivities in downtown Armonk, noon–5pm, with the parade and tree-lighting ceremony at 3:30pm — ' +
        'organized by Friends of Frosty, a volunteer nonprofit, with over 40 local groups marching in the parade.',
      url: 'https://www.armonkfrosty.com/',
      category: 'holiday',
    },
    {
      key: 'ncpl-friends-gallery-2026',
      title: 'Friends Gallery Exhibit',
      date: '2026-04-09',
      endDate: '2026-07-31',
      location: 'North Castle Public Library, Armonk',
      description: 'Rotating art exhibit in the Friends Gallery at the Armonk library, presented by the Friends of the North Castle Public Library.',
      url: 'https://www.northcastlelibrary.org/',
      category: 'civic',
    },
    {
      key: 'bhcsd-thanksgiving-recess-2026',
      title: 'Byram Hills Schools — Thanksgiving Recess',
      date: '2026-11-26',
      endDate: '2026-11-27',
      location: 'Byram Hills Central School District',
      description: 'No school for Byram Hills CSD students — Thanksgiving recess, per the 2026–27 district calendar.',
      url: 'https://www.byramhills.org/district/calendar',
      category: 'holiday',
    },
    {
      key: 'bhcsd-holiday-recess-2026',
      title: 'Byram Hills Schools — Holiday Recess',
      date: '2026-12-24',
      endDate: '2026-12-31',
      location: 'Byram Hills Central School District',
      description: 'No school for Byram Hills CSD students — winter holiday recess, per the 2026–27 district calendar.',
      url: 'https://www.byramhills.org/district/calendar',
      category: 'holiday',
    },
    {
      key: 'bhcsd-winter-recess-2027',
      title: 'Byram Hills Schools — Winter Recess',
      date: '2027-02-15',
      endDate: '2027-02-19',
      location: 'Byram Hills Central School District',
      description: 'No school for Byram Hills CSD students — midwinter recess, per the 2026–27 district calendar.',
      url: 'https://www.byramhills.org/district/calendar',
      category: 'holiday',
    },
    {
      key: 'bhcsd-spring-recess-2027',
      title: 'Byram Hills Schools — Spring Recess',
      date: '2027-03-22',
      endDate: '2027-03-26',
      location: 'Byram Hills Central School District',
      description: 'No school for Byram Hills CSD students — spring recess, per the 2026–27 district calendar.',
      url: 'https://www.byramhills.org/district/calendar',
      category: 'holiday',
    },
  ],
}

/** All community events for a town, or [] if none tracked. */
export function getCommunityEvents(muniKey: string): CommunityEvent[] {
  return EVENTS[muniKey] ?? []
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** "Add to Google Calendar" prefill link — a timed event when startTime is set,
 *  otherwise an all-day (or multi-day) event. Assumes America/New_York, the
 *  only timezone any tracked town is in. */
export function googleCalendarUrl(ev: CommunityEvent): string {
  const compact = (iso: string) => iso.replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    details: ev.description,
    location: ev.location,
  })
  if (ev.startTime) {
    const start = `${compact(ev.date)}T${ev.startTime.replace(':', '')}00`
    const end = `${compact(ev.endDate ?? ev.date)}T${(ev.endTime ?? ev.startTime).replace(':', '')}00`
    params.set('dates', `${start}/${end}`)
    params.set('ctz', 'America/New_York')
  } else {
    // Google's all-day end date is exclusive, so extend one day past the last day.
    params.set('dates', `${compact(ev.date)}/${compact(addDaysIso(ev.endDate ?? ev.date, 1))}`)
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
