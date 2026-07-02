/**
 * Massachusetts adapter — COMMBUYS (Operational Services Division).
 * Uses the shared BSO PrimeFaces parser (same platform as NJSTART).
 */
import type { IngestAdapter } from './base'
import { ingestBso } from './bso'

const ma: IngestAdapter = {
  state: 'MA',
  sourceName: 'COMMBUYS',
  ingest: () =>
    ingestBso({
      state: 'MA',
      sourceName: 'COMMBUYS',
      baseUrl: 'https://www.commbuys.com',
    }),
}

export default ma
