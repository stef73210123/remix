/**
 * Shared parser for Oracle/Periscope BSO portals (PrimeFaces datatable).
 *
 * Both NJSTART and COMMBUYS run on the same platform with an identical page
 * shape. The public open-bids URL is:
 *   {baseUrl}/bso/view/search/external/advancedSearchBid.xhtml?openBids=true
 *
 * Rows: <tr data-ri="N" class="ui-widget-content ui-datatable-...">
 * Columns (0-indexed):
 *   [0] Bid Solicitation # (also the link)
 *   [2] Organization Name (agency)
 *   [5] Buyer
 *   [6] Description (title)
 *   [7] Bid Opening Date "MM/DD/YYYY HH:MM:SS" or "MM/DD/YYYY HH:MM AM/PM"
 *  [10] Status ("Sent" for open bids)
 *
 * Detail link: /bso/external/bidDetail.sda?docId={ID}&external=true&parentUrl=close
 */
import * as cheerio from 'cheerio'
import type { Opportunity, StateCode } from '@/lib/opportunities'
import { accumulate, emptyStats, matchesFilter } from '@/lib/rfp-filter'
import type { AdapterResult } from './base'
import { MAX_RECORDS_PER_ADAPTER, parseUsDate, politeFetch } from './base'

export interface BsoConfig {
  state: StateCode
  sourceName: string
  baseUrl: string // e.g. "https://www.commbuys.com"
}

export async function ingestBso(cfg: BsoConfig): Promise<AdapterResult> {
  const url = `${cfg.baseUrl}/bso/view/search/external/advancedSearchBid.xhtml?openBids=true`
  const stats = emptyStats()
  const records: Opportunity[] = []
  const now = new Date().toISOString()

  let html: string
  try {
    const res = await politeFetch(url)
    if (!res.ok) {
      return {
        ok: false,
        records,
        stats,
        error: `HTTP ${res.status} from ${cfg.sourceName}`,
        fetched: 0,
      }
    }
    html = await res.text()
  } catch (e) {
    return {
      ok: false,
      records,
      stats,
      error: e instanceof Error ? e.message : String(e),
      fetched: 0,
    }
  }

  const $ = cheerio.load(html)
  const rows = $('tr[data-ri]').toArray()

  let fetched = 0
  for (const row of rows) {
    if (fetched >= MAX_RECORDS_PER_ADAPTER) break
    fetched++
    const cells = $(row).find('td').toArray().map((td) => $(td).text().trim().replace(/\s+/g, ' '))
    if (cells.length < 11) continue

    const sourceId = (cells[0] || cells[1] || '').trim()
    if (!sourceId) continue

    const agency = cells[2] || ''
    const title = cells[6] || ''
    const dueRaw = cells[7] || ''
    const status = cells[10] || ''

    // Skip non-open bids defensively (openBids=true should already filter).
    if (status && !/sent|open/i.test(status)) continue

    // Find the detail link inside this row.
    const href = $(row).find('a[href*="/bso/external/bidDetail.sda"]').first().attr('href') || ''
    const detailUrl = href
      ? new URL(href.replace(/&amp;/g, '&'), cfg.baseUrl).toString()
      : url

    const { iso, label } = parseUsDate(dueRaw)

    const result = matchesFilter(title, '', agency)
    accumulate(stats, result)
    if (!result.pass) continue

    const rec: Opportunity = {
      id: `${cfg.state}:${sourceId}`,
      state: cfg.state,
      sourceId,
      sourceName: cfg.sourceName,
      sourceUrl: detailUrl,
      linkStatus: 'direct',
      title,
      agency,
      city: '',
      due: iso,
      dueLabel: label || dueRaw,
      cr: sourceId,
      tier: '',
      rationale: '',
      notes: '',
      curated: false,
      ingestedAt: now,
    }
    records.push(rec)
  }

  return { ok: true, records, stats, fetched }
}
