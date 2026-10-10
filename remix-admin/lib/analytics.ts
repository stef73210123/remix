/**
 * One place every behavioural event on the site goes through.
 *
 * Why a wrapper rather than calling a vendor SDK at each site: the call sites
 * (a board page, a case modal, a mailto button) should not know or care who
 * stores the data. Vercel Web Analytics is cookieless and already deployed, so
 * it is always on; PostHog is an optional second sink that switches on with an
 * env var and brings the things Vercel cannot do — funnels, user paths,
 * retention. Adding, swapping or dropping a backend is a change here, never a
 * re-instrumentation of the app.
 *
 * Privacy posture, which is a deliberate choice for a civic-transparency site:
 *   • No personal data, ever. Residents look up their neighbours' land-use
 *     applications here; what a given person reads is nobody's business.
 *   • Free text is never sent. A search is recorded as "a search happened,
 *     N results" — never the string, which on this site would routinely
 *     contain a neighbour's name or street address.
 *   • Identifiers we do send (a board key, a case id, a member name) describe
 *     PUBLIC records and officials acting in office, not the visitor.
 */

export type EventName =
  // --- navigation with identity (the thing bare pageviews cannot tell us) ---
  | 'board_view'          // which board page, by key
  | 'member_view'         // which official's profile
  | 'case_view'           // which application/agenda item was opened
  | 'meeting_view'        // a meeting's analysis row expanded
  // --- intent: the resident is trying to DO something ---
  | 'civic_action'        // FOIL request / report an issue / contact us
  | 'email_click'         // mailto: the board, an office, or one member
  | 'document_open'       // agenda, minutes, resolution, submitted plan
  | 'transcript_open'     // meeting transcript
  | 'external_link'       // off-site link (Town portal, news story)
  // --- exploration: how people work the data ---
  | 'search'              // count only, never the query string
  | 'filter_apply'
  | 'group_change'
  | 'sort_change'
  | 'chart_interact'      // map, timeline, donut, sankey, spectrum…
  | 'tab_change'

/**
 * Event properties. Scalars only — Vercel flattens anything else, and a shared
 * shape keeps `eventData/<key>` groupings comparable across event names.
 */
export type EventProps = Record<string, string | number | boolean | null | undefined>

/** Vercel rejects very long values; truncate rather than silently drop the event. */
const MAX_VALUE = 120

function clean(props?: EventProps): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {}
  if (!props) return out
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === '') continue
    out[k] = typeof v === 'string' && v.length > MAX_VALUE ? v.slice(0, MAX_VALUE) : v
  }
  return out
}

/** PostHog is loaded on demand so it costs nothing in the bundle when unconfigured. */
let posthogLoader: Promise<unknown> | null = null
function posthog(): Promise<{ capture: (n: string, p?: object) => void } | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || typeof window === 'undefined') return Promise.resolve(null)
  if (!posthogLoader) {
    posthogLoader = import('posthog-js')
      .then((mod) => {
        const ph = mod.default
        ph.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          // Cookieless, to match the posture Vercel Web Analytics already sets.
          // Flip to 'localStorage+cookie' only if cross-session retention is
          // worth the consent banner it would oblige.
          persistence: 'memory',
          autocapture: false,
          capture_pageview: true,
          disable_session_recording: true,
        })
        return ph
      })
      .catch(() => null)
  }
  return posthogLoader as Promise<{ capture: (n: string, p?: object) => void } | null>
}

/**
 * Record one event. Never throws and never blocks the interaction that caused
 * it — analytics must not be able to break a page.
 */
export function track(name: EventName, props?: EventProps): void {
  if (typeof window === 'undefined') return
  const data = clean(props)
  import('@vercel/analytics')
    .then((m) => m.track(name, data))
    .catch(() => {})
  posthog()
    .then((ph) => ph?.capture(name, data))
    .catch(() => {})
}

/**
 * Bucket a count instead of sending the raw number. Keeps result-count
 * cardinality low enough to group on, and means a "1 result" search can't be
 * paired with a timestamp to infer what someone looked up.
 */
export function bucket(n: number): string {
  if (n <= 0) return '0'
  if (n === 1) return '1'
  if (n <= 5) return '2-5'
  if (n <= 20) return '6-20'
  if (n <= 100) return '21-100'
  return '100+'
}
