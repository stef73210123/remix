/**
 * New York adapter — NYSCR (New York State Contract Reporter).
 *
 * NYSCR's search page (nyscr.ny.gov/Ads/Search) is a JS-rendered SPA — the
 * server-side HTML is just a shell. We use the shared Anthropic web_search
 * adapter to have the model retrieve currently open ads matching Stefan's
 * filter buckets.
 *
 * Post-processing: any CR numbers matching a curated row get a URL upgrade
 * via the store's putRfp() curated-flag protection logic.
 */
import type { IngestAdapter } from './base'
import { ingestViaAnthropicSearch } from './anthropic-search'

const ny: IngestAdapter = {
  state: 'NY',
  sourceName: 'NYSCR',
  ingest: () =>
    ingestViaAnthropicSearch({
      state: 'NY',
      sourceName: 'NYSCR',
      portalDescription:
        'the New York State Contract Reporter at nyscr.ny.gov (search URL: https://www.nyscr.ny.gov/Ads/Search?Status=Open). The sourceId is the CR# (contract reporter number). Direct URLs look like https://www.nyscr.ny.gov/Ads/AdSummary?adId={id} or similar.',
      perRun: 40,
    }),
}

export default ny
