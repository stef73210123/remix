/**
 * Connecticut adapter — CTsource Bid Board.
 *
 * CTsource runs on Proactis WebProcure (webprocure.proactiscloud.com), an
 * Angular SPA embedded via iframe on portal.ct.gov/das/ctsource/bidboard.
 * Server-side fetches return only `<app-root>Loading…</app-root>`, so we
 * use the shared Anthropic web_search adapter to reach the rendered
 * content.
 *
 * CT's WebProcure customerId is 51.
 */
import type { IngestAdapter } from './base'
import { ingestViaAnthropicSearch } from './anthropic-search'

const ct: IngestAdapter = {
  state: 'CT',
  sourceName: 'CTsource',
  ingest: () =>
    ingestViaAnthropicSearch({
      state: 'CT',
      sourceName: 'CTsource',
      portalDescription:
        'the Connecticut CTsource Bid Board at portal.ct.gov/das/ctsource/bidboard (backed by webprocure.proactiscloud.com/wp-web-public/#/bidboard/search?customerid=51). Direct URLs are anchor-linked deep-links inside the Proactis WebProcure SPA.',
      perRun: 30,
    }),
}

export default ct
