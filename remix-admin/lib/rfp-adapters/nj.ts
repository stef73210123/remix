/**
 * New Jersey adapter — NJSTART (Division of Purchase and Property).
 * Uses the shared BSO PrimeFaces parser (same platform as COMMBUYS).
 */
import type { IngestAdapter } from './base'
import { ingestBso } from './bso'

const nj: IngestAdapter = {
  state: 'NJ',
  sourceName: 'NJSTART',
  ingest: () =>
    ingestBso({
      state: 'NJ',
      sourceName: 'NJSTART',
      baseUrl: 'https://www.njstart.gov',
    }),
}

export default nj
