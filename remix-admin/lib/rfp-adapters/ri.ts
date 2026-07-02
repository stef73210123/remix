/**
 * Rhode Island adapter — RIDOP / Ocean State Procures (OSP).
 *
 * RIDOP embeds the same Proactis WebProcure SPA that CT uses (customerId
 * 46 for RI). Server-side scraping doesn't work — using the shared
 * Anthropic web_search adapter.
 */
import type { IngestAdapter } from './base'
import { ingestViaAnthropicSearch } from './anthropic-search'

const ri: IngestAdapter = {
  state: 'RI',
  sourceName: 'RIDOP-OSP',
  ingest: () =>
    ingestViaAnthropicSearch({
      state: 'RI',
      sourceName: 'RIDOP-OSP',
      portalDescription:
        'the Rhode Island Division of Purchases Ocean State Procures (OSP) contract board at ridop.ri.gov/vendors/bidding-opportunities (backed by webprocure.proactiscloud.com/wp-web-public/#/bidboard/search?customerid=46). Direct URLs are deep-links inside the Proactis WebProcure SPA.',
      perRun: 25,
    }),
}

export default ri
