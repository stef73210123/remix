# Analytics

## What's collected, and what deliberately isn't

Every event goes through `track()` in [`lib/analytics.ts`](../lib/analytics.ts). Call
sites never talk to a vendor SDK directly, so adding, swapping or dropping a
backend is a change in that one file rather than a re-instrumentation.

Two sinks:

| Sink | Status | What it's for |
|---|---|---|
| **Vercel Web Analytics** | always on | pageviews, referrers, geography, devices, and event counts broken down by property |
| **PostHog** | off until `NEXT_PUBLIC_POSTHOG_KEY` is set | funnels, user paths, retention — the questions Vercel cannot answer |

### Privacy posture

This is a civic-transparency site. Residents use it to read their neighbours'
land-use applications, and what a given person reads is nobody's business.

- **No personal data about visitors, ever.** No logins, no user IDs, no cookies.
  Both sinks are configured cookieless (PostHog runs `persistence: 'memory'`,
  `autocapture: false`, session recording disabled).
- **Free text is never sent.** A search is recorded as *a search happened, with
  roughly this many results* — never the string. On this site a query is
  usually a neighbour's name or street address.
- **Counts are bucketed** (`bucket()`): `1`, `2-5`, `6-20`, … A "1 result"
  search can't be paired with a timestamp to infer what someone looked up.
- **The identifiers we do send describe public records and officials acting in
  office** — a board key, a case id, a member's name — not the visitor.

If you ever turn on PostHog session recording or `localStorage` persistence,
that is a different privacy posture and needs a consent banner and a line in
the site's privacy note. Don't do it casually.

## Event catalogue

### Navigation with identity
These exist because a bare pageview can't tell boards apart: the identity lives
in the query string (`/admin/municipal/board?body=planning`) and Vercel's
`requestPath` dimension strips it.

| Event | Properties |
|---|---|
| `board_view` | `muni`, `board` |
| `member_view` | `muni`, `board`, `member` |
| `case_view` | `muni`, `board`, `case`, `source` (`list` / `map` / `link` / `neighbour`) |
| `meeting_view` | `muni`, `board`, `date`, `from` (`timeline` / `list`) |

### Intent — the resident is trying to do something
| Event | Properties |
|---|---|
| `civic_action` | `action` (`foil_request` / `report_issue` / `contact_site`), `destination` |
| `email_click` | `target` (`board` / `office`), `board`, `office`, `recipients` |
| `document_open` | `muni`, `case` or `board`, `kind` / `label`, `from` |
| `transcript_open` | `muni`, `board`, `date` |

### Exploration
| Event | Properties |
|---|---|
| `search` | `muni`, `board`, `length` (bucketed), `results` (bucketed) — **never the query** |
| `filter_apply` | `muni`, `board`, `active`, `status`, `type`, `theme`, `year`, `results` |
| `group_change` / `sort_change` | `muni`, `board`, `group` / `sort` |
| `chart_interact` | `muni`, `board`, `chart`, `action` |
| `tab_change` | `muni`, `to`, `kind`, `from` |

## Known blind spots

Read these before drawing conclusions from the numbers.

1. **`civic_action` counts openings, not submissions.** The FOIL portal
   (NextRequest), the issue reporter (SeeClickFix) and the contact form are all
   third-party, cross-origin surfaces. We can see someone open them; we cannot
   see them submit. `report_issue` is *intent to report*, not *issues reported*.
   Getting real submission counts would need the Town's own portal analytics.
2. **FOIL is an outbound link.** `foil_request` fires on click; whether the tab
   loaded is unknown.
3. **`?case=` doesn't produce a pageview.** The case modal syncs the URL with
   `replaceState`, which no analytics tool treats as a navigation. `case_view`
   is the only record of it.
4. **Vercel gives counts, not journeys.** You can ask "how many people opened
   the Planning Board", not "what did someone do before they filed a FOIL". That
   is the gap PostHog fills.

## Querying it

Vercel, via the MCP tools or the REST API — group by `eventData/<property>`:

```bash
curl --get "https://api.vercel.com/v1/query/web-analytics/events/aggregate" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  --data-urlencode "projectId=opennorthcastle" \
  --data-urlencode "since=2026-10-01" --data-urlencode "until=2026-10-31" \
  --data-urlencode "by=eventData/board" \
  --data-urlencode "filter=eventName eq 'board_view'"
```

## Turning PostHog on

1. Create a free project at posthog.com (1M events/month free; the site did
   ~2,300 pageviews in three months, so this is not close to a constraint) or
   self-host — it's open source (MIT).
2. Set on the Vercel project:
   - `NEXT_PUBLIC_POSTHOG_KEY` — the project API key
   - `NEXT_PUBLIC_POSTHOG_HOST` — optional, defaults to `https://us.i.posthog.com`;
     use `https://eu.i.posthog.com` for EU residency
3. Redeploy. `posthog-js` is already a dependency and is dynamically imported,
   so it stays out of the bundle entirely while the key is unset.

No call sites change. Vercel keeps running alongside.
