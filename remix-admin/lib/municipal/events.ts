/**
 * Community events calendar for tracked municipalities — town fairs, concert
 * series, and civic celebrations (distinct from the board/committee Meetings
 * timeline elsewhere in the dashboard). Committed static data, like
 * elections.ts/departments.ts, so it renders with no DB dependency.
 *
 * Dates/times/locations are sourced from the organizing groups' own listings
 * (Armonk Lions Club, Armonk Chamber of Commerce, Armonk Outdoor Art Show,
 * Friends of Frosty, North Castle Public Library, North Castle Historical
 * Society, Byram Hills CSD); see each event's `url`.
 */

/**
 * A standing weekly event — one entry that stands for every occurrence, rather
 * than fifty-two near-identical entries in the list below.
 */
export interface EventRecurrence {
  /** Day of the week, 0 = Sunday, matching `Date.getDay()`. */
  weekday: number
  /**
   * Last date the series is known to run. Standing events rarely announce an
   * end, so this is a horizon rather than a fact: it stops the calendar
   * promising nights nobody has confirmed, and wants extending as the series
   * continues. The event drops off the calendar once it passes.
   */
  until: string
}

export interface CommunityEvent {
  key: string
  title: string
  /** Start date, YYYY-MM-DD. For a series, its first occurrence. */
  date: string
  /** Inclusive end date for multi-day events, YYYY-MM-DD. */
  endDate?: string
  /** 24h local time, e.g. '18:00'. Omit for an all-day/unspecified-time listing. */
  startTime?: string
  /** Earlier than `startTime` for a night running past midnight — 19:00–01:00. */
  endTime?: string
  location: string
  description: string
  /** The organizer's own event page. Absent when the organizer publishes none. */
  url?: string
  category: 'festival' | 'market' | 'concert' | 'holiday' | 'civic' | 'social'
  /** Set for a standing event that repeats weekly. */
  recurrence?: EventRecurrence
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
      key: 'halloween-haunt-2026',
      title: 'Halloween Haunt',
      date: '2026-10-24',
      endDate: '2026-10-25',
      location: "Smith's Tavern, 440 Bedford Road, Armonk",
      description:
        "A haunted house, games, pumpkin painting and ghost stories at the historic Smith's Tavern — " +
        'a community fundraiser hosted by the North Castle Historical Society.',
      url: 'https://www.northcastlehistoricalsociety.org/',
      category: 'festival',
    },
    {
      // Friends of Frosty's own site disagrees with itself on the date. Every
      // page carries a banner reading "SUNDAY DEC. 6, 2026"; the press release
      // on /about-frosty is headed "SATURDAY, DECEMBER 5, 2026" and then says
      // "Saturday, December 4, 2026" in its first line. Dec 4 is a Friday, so
      // that last one cannot be right and the release is evidently last year's
      // text reused. The banner is the element they refresh, it is repeated on
      // all eight pages, and its weekday and date agree — so Sunday the 6th,
      // since confirmed. The release's 4pm parade is stale for the same reason;
      // 3:30pm, as the Chamber's calendar has it, is the confirmed time.
      key: 'frosty-day-2026',
      title: 'Frosty Day & Parade',
      date: '2026-12-06',
      startTime: '12:00',
      endTime: '17:00',
      location: 'Downtown Armonk',
      description:
        'The annual homecoming of Frosty the Snowman, whose lyricist Steve Nelson lived in Armonk — organized by ' +
        'Friends of Frosty, a volunteer nonprofit, with over 40 local and county groups in the parade. Free. ' +
        'Activities around downtown from noon: miniature trains, a horse-drawn wagon, the bubble truck, face ' +
        'decorating and cookie frosting at the shops. The parade steps off at 3:30pm, running north on Main Street ' +
        'to Maple Avenue and into Wampus Brook Park, followed by the tree-lighting and sing-along at the gazebo.',
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
    {
      key: 'cider-donut-2026',
      title: "Cider & Donut Festival and Jamie's 5K Run for Love",
      date: '2026-10-04',
      startTime: '09:00',
      endTime: '14:00',
      location: 'Wampus Brook Park, Maple Avenue & Bedford Road, Armonk',
      description:
        "The 14th annual Cider & Donut Festival, run with Jamie's 5K Run for Love partnering with Stayin' Alive and " +
        'the Byram Hills Pre-School Association. Races first — mile at 9am, the 5K run/walk at 9:15, the Beascakes ' +
        'Donut Dash for the youngest runners at 10 — then the carnival from 10:30 to 2: hot donuts, fresh-pressed ' +
        'cider, food trucks, live music, rides, bouncy houses, face painting, and the pie-eating and donut-fishing ' +
        'contests. Same-day race registration opens at 8am by the gazebo. Net proceeds go to children’s programs at ' +
        'the North Castle Public Library, the Byram Hills Pre-School Association and the Armonk Chamber of Commerce.',
      url: 'https://www.armonkchamberofcommerce.com/cider-and-donut-festival-jamies-5k-run-for-love/',
      category: 'festival',
    },
    {
      key: 'legion-bar-friday',
      title: 'Friday Bar Night at the American Legion',
      date: '2026-10-02',
      startTime: '19:00',
      endTime: '01:00',
      recurrence: { weekday: 5, until: '2027-10-01' },
      location: 'American Legion Post 1097, 35 Bedford Road, Armonk',
      description:
        'The bar at North Castle Post 1097 is open to the public on Friday nights — drinks, pool, darts and music. ' +
        'Cash only; beer $4–5, wine and house drinks $6, premium drinks $8. ' +
        'The post does not publish a fixed closing time and says it stays open as long as people are there, ' +
        'so the 1am end shown here is a listing convention rather than last call.',
      category: 'social',
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

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** RFC 5545 day abbreviations, indexed the same way as `Date.getDay()`. */
const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

/**
 * Every date this event should put a marker on: each day of a multi-day event,
 * or each occurrence of a weekly series up to its horizon. One-off, single-day
 * events return just their own date.
 */
export function eventDates(ev: CommunityEvent): string[] {
  if (ev.recurrence) {
    const out: string[] = []
    for (let cur = ev.date; cur <= ev.recurrence.until; cur = addDaysIso(cur, 7)) out.push(cur)
    return out
  }
  if (!ev.endDate || ev.endDate === ev.date) return [ev.date]
  const out: string[] = []
  for (let cur = ev.date; cur <= ev.endDate; cur = addDaysIso(cur, 1)) out.push(cur)
  return out
}

/**
 * When this event next happens on or after `todayIso`, or null once it is over.
 *
 * A one-off counts as upcoming until its own last day has passed, so a festival
 * running right now still reports today rather than disappearing mid-run.
 */
export function nextOccurrence(ev: CommunityEvent, todayIso: string): string | null {
  if (ev.recurrence) {
    if (ev.recurrence.until < todayIso) return null
    for (let cur = ev.date; cur <= ev.recurrence.until; cur = addDaysIso(cur, 7)) {
      if (cur >= todayIso) return cur
    }
    return null
  }
  if ((ev.endDate ?? ev.date) < todayIso) return null
  return ev.date
}

/** "Every Friday" for a standing event, or null for a one-off. */
export function recurrenceLabel(ev: CommunityEvent): string | null {
  return ev.recurrence ? `Every ${WEEKDAY_NAMES[ev.recurrence.weekday]}` : null
}

/** "Add to Google Calendar" prefill link — a timed event when startTime is set,
 *  otherwise an all-day (or multi-day) event. Assumes America/New_York, the
 *  only timezone any tracked town is in.
 *
 *  `from` overrides the start date, so a standing event can be added beginning
 *  at its next occurrence rather than dragging in every night since the series
 *  began. */
export function googleCalendarUrl(ev: CommunityEvent, from?: string): string {
  const compact = (iso: string) => iso.replace(/-/g, '')
  const startDate = from ?? ev.date
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    details: ev.description,
    location: ev.location,
  })
  if (ev.startTime) {
    const endTime = ev.endTime ?? ev.startTime
    // A bar night listed 19:00–01:00 ends the following morning. Without this
    // the end lands before the start and Google rejects the range.
    const pastMidnight = endTime <= ev.startTime
    const lastDay = ev.recurrence
      ? (pastMidnight ? addDaysIso(startDate, 1) : startDate)
      : (pastMidnight ? addDaysIso(ev.endDate ?? startDate, 1) : (ev.endDate ?? startDate))
    params.set(
      'dates',
      `${compact(startDate)}T${ev.startTime.replace(':', '')}00/${compact(lastDay)}T${endTime.replace(':', '')}00`,
    )
    params.set('ctz', 'America/New_York')
  } else {
    // Google's all-day end date is exclusive, so extend one day past the last day.
    params.set('dates', `${compact(startDate)}/${compact(addDaysIso(ev.endDate ?? startDate, 1))}`)
  }
  if (ev.recurrence) {
    const until = `${compact(ev.recurrence.until)}T235959Z`
    params.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DAYS[ev.recurrence.weekday]};UNTIL=${until}`)
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
