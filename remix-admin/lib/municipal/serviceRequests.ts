/**
 * Citizen service requests and how quickly the Town closed them.
 *
 * North Castle runs SeeClickFix for resident-reported problems — potholes,
 * downed limbs, dead street lights — and configures a service-level target per
 * category. The report released under FOIL 26-559 carries both halves: the
 * volume, and the Town's performance against its own targets. That makes this
 * the only dataset on the site that measures *responsiveness* rather than
 * deliberation, which is why it gets its own panel rather than a document link.
 *
 * Two categories need care and are handled in the data file, not here:
 * "Pothole Test" is an internal test bucket and is dropped; "Street Sign" has
 * no target configured, so its `pctClosedWithinSla` is null rather than 0 — a
 * missing target is not the same as a target missed every time.
 */
import fs from 'fs'
import path from 'path'

export interface ServiceRequestCategory {
  category: string
  created: number
  acknowledged: number
  closed: number
  avgDaysToAcknowledge: number | null
  avgDaysToClose: number | null
  /** The Town's own target, in days. Null where none is configured. */
  slaDays: number | null
  slaLabel: string | null
  /** Null where no target exists — distinct from 0, which means never met. */
  pctClosedWithinSla: number | null
  overdue: number
  open: number
}

export interface ServiceRequestMeta {
  town: string
  muniKey: string
  system: string
  periodStart: string
  periodEnd: string
  totalRequests: number
  source: string
  note: string
}

export interface ServiceRequestDataset {
  meta: ServiceRequestMeta
  categories: ServiceRequestCategory[]
}

const FILES: Record<string, string> = {
  nc: 'nc-service-requests.json',
}

let cache: Record<string, ServiceRequestDataset | null> = {}

export function loadServiceRequests(muniKey: string): ServiceRequestDataset | null {
  if (muniKey in cache) return cache[muniKey]
  const file = FILES[muniKey]
  if (!file) return (cache[muniKey] = null)
  try {
    const p = path.join(process.cwd(), 'lib', 'municipal', 'data', file)
    cache[muniKey] = JSON.parse(fs.readFileSync(p, 'utf8')) as ServiceRequestDataset
  } catch {
    cache[muniKey] = null
  }
  return cache[muniKey]
}

export interface ServiceRequestSummary {
  totalRequests: number
  /** Categories that actually saw a request, busiest first. */
  ranked: ServiceRequestCategory[]
  /** Requests in categories with a target, and how many of those met it. */
  withTarget: number
  metTarget: number
  /** Share of targeted requests closed on time, rounded. Null if none. */
  pctMet: number | null
  /** Longest average time-to-close among categories that saw requests. */
  slowest: ServiceRequestCategory | null
  totalOverdue: number
  totalOpen: number
}

/**
 * Roll the per-category rows into the handful of numbers a reader wants first.
 *
 * The town-wide hit rate is weighted by volume across categories that have a
 * target — an unweighted mean of percentages would let a single Graffiti
 * request at 100% offset forty-three potholes at 29%.
 */
export function summarize(data: ServiceRequestDataset): ServiceRequestSummary {
  const active = data.categories.filter((c) => c.created > 0)
  const ranked = [...active].sort((a, b) => b.created - a.created)
  const targeted = active.filter((c) => c.pctClosedWithinSla !== null && c.slaDays !== null)

  const withTarget = targeted.reduce((n, c) => n + c.created, 0)
  const metTarget = targeted.reduce((n, c) => n + (c.created * (c.pctClosedWithinSla as number)) / 100, 0)

  const closers = active.filter((c) => c.avgDaysToClose !== null)
  const slowest = closers.length
    ? closers.reduce((a, b) => ((b.avgDaysToClose as number) > (a.avgDaysToClose as number) ? b : a))
    : null

  return {
    totalRequests: data.meta.totalRequests,
    ranked,
    withTarget,
    metTarget: Math.round(metTarget),
    pctMet: withTarget > 0 ? Math.round((metTarget / withTarget) * 100) : null,
    slowest,
    totalOverdue: active.reduce((n, c) => n + c.overdue, 0),
    totalOpen: active.reduce((n, c) => n + c.open, 0),
  }
}
