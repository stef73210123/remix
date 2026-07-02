/**
 * RFP relevance filter derived from the 13 hand-curated NY entries.
 *
 * Seven inclusion buckets; a record qualifies on any bucket EXCEPT bucket 3
 * (advisory / consulting / vendor-pool language), which only qualifies when
 * paired with a hit from another bucket. This kills the "management
 * consulting services" false positives that flood any statewide portal.
 *
 * Exclusion categories reject records whose only match came from
 * healthcare / commodity / non-RE contexts.
 *
 * Used by every state adapter (NY, CT, NJ, RI, MA) and surfaced in the
 * cron report as a rejection rate.
 */

export type FilterBucket =
  | 'real-estate'
  | 'land-use-planning'
  | 'advisory-consulting'
  | 'economic-development'
  | 'proptech-data'
  | 'appraisal-valuation'
  | 'land-based-energy'

export interface FilterResult {
  pass: boolean
  buckets: FilterBucket[]
  reason?: string
}

interface Bucket {
  name: FilterBucket
  /** Whole-word keyword patterns. Case-insensitive; matched on title+agency+description. */
  keywords: RegExp[]
}

const BUCKETS: Bucket[] = [
  {
    name: 'real-estate',
    keywords: [
      /\breal\s+estate\b/i,
      /\breal\s+property\b/i,
      /\bdevelopment\b/i,
      /\bredevelopment\b/i,
      /\bground\s+lease\b/i,
      /\bland\s+lease\b/i,
      /\bsite\s+selection\b/i,
      /\bland\s+assemblage\b/i,
      /\bmixed[-\s]?use\b/i,
      /\bhousing\b/i,
      /\bstudent\s+housing\b/i,
      /\baffordable\s+housing\b/i,
      /\bmultifamily\b/i,
      /\badaptive\s+reuse\b/i,
    ],
  },
  {
    name: 'land-use-planning',
    keywords: [
      /\bzoning\b/i,
      /\bland\s+use\b/i,
      /\bentitlement/i,
      /\bcomprehensive\s+plan/i,
      /\bcommunity\s+plan/i,
      /\bsmart\s+growth\b/i,
      /\bmaster\s+plan\b/i,
      /\bbrownfield/i,
      /\bsite\s+reuse\b/i,
      /\brevitalization\b/i,
      /\bdowntown\s+revitalization\b/i,
      /\burban\s+plan/i,
    ],
  },
  {
    name: 'advisory-consulting',
    // Bucket 3 — AND-gated. Only qualifies when another bucket also hits.
    keywords: [
      /\bconsulting\s+services\b/i,
      /\bconsultant\s+pool\b/i,
      /\bpre[-\s]?qualified\b/i,
      /\bqualified\s+vendor\b/i,
      /\badvisory\s+services\b/i,
      /\bconsulting\s+pool\b/i,
    ],
  },
  {
    name: 'economic-development',
    keywords: [
      /\beconomic\s+development\b/i,
      /\bEDC\b/,
      /\bbusiness\s+consulting\b/i,
      /\bindustrial\s+development\b/i,
    ],
  },
  {
    name: 'proptech-data',
    keywords: [
      /\basset\s+management\s+(system|software|platform)\b/i,
      /\bPropTech\b/i,
      /\bGIS\b/,
      /\bgeospatial\b/i,
      /\blocation\s+intelligence\b/i,
      /\bmapping\s+(services|platform|system)\b/i,
      /\btransportation\s+planning\b/i,
      /\bplanning\s+(data|platform|system)\b/i,
    ],
  },
  {
    name: 'appraisal-valuation',
    keywords: [
      /\bappraisal\b/i,
      /\bvaluation\b/i,
      /\breal\s+property\s+appraisal\b/i,
    ],
  },
  {
    name: 'land-based-energy',
    keywords: [
      /\benergy\s+storage\b/i,
      /\bjust\s+transition\b/i,
      /\bsolar\s+(siting|land\s+lease)\b/i,
      /\blandfill\s+reuse\b/i,
    ],
  },
]

/**
 * Exclusion patterns. If the record's ONLY signal comes from an excluded
 * context, reject it — but a positive bucket hit still lets it through
 * (a genuine RE deal on a healthcare campus, for example, should pass).
 */
const EXCLUSIONS: RegExp[] = [
  /\bpharma/i,
  /\bmedicaid\b/i,
  /\bhospital\b/i,
  /\bnursing\s+home\b/i,
  /\bfleet\s+(maintenance|management|vehicle)\b/i,
  /\buniform/i,
  /\bfood\s+service\b/i,
  /\bjanitorial\b/i,
  /\bcurriculum\b/i,
  /\btextbook/i,
  /\bcybersecurity\b/i,
  /\bendpoint\s+(protection|management)\b/i,
  /\bchild\s+welfare\b/i,
  /\bSNAP\b/,
  /\bpavement\b/i,
  /\bbridge\s+(inspection|maintenance)\b/i,
  /\bwater\s+treatment\b/i,
]

const BUCKET_3: FilterBucket = 'advisory-consulting'

/**
 * Test a record for relevance. Returns which buckets matched and whether
 * the record passes the filter.
 *
 * @param title - Solicitation title
 * @param description - Optional longer description
 * @param agency - Optional agency/organization name
 */
export function matchesFilter(
  title: string,
  description?: string,
  agency?: string,
): FilterResult {
  const blob = [title, description || '', agency || ''].join(' ')

  const buckets: FilterBucket[] = []
  for (const bucket of BUCKETS) {
    if (bucket.keywords.some((r) => r.test(blob))) {
      buckets.push(bucket.name)
    }
  }

  if (buckets.length === 0) {
    return { pass: false, buckets: [], reason: 'no-bucket-hit' }
  }

  // Bucket 3 AND-gate: consulting/advisory language alone doesn't qualify.
  const onlyBucket3 = buckets.length === 1 && buckets[0] === BUCKET_3
  if (onlyBucket3) {
    return {
      pass: false,
      buckets,
      reason: 'bucket-3-standalone (needs pairing with RE/land-use/ED/PropTech/appraisal/energy)',
    }
  }

  // Exclusion check — reject if a strong exclusion term appears AND the
  // only bucket hit is bucket 3. (Loose safety net; the AND-gate above
  // already catches most consulting-only false positives.)
  const excluded = EXCLUSIONS.some((r) => r.test(blob))
  if (excluded && buckets.length === 1 && buckets[0] === BUCKET_3) {
    return { pass: false, buckets, reason: 'excluded-category' }
  }

  return { pass: true, buckets }
}

/**
 * Aggregate stats used by the cron report to expose over- or under-filtering.
 */
export interface FilterStats {
  total: number
  passed: number
  rejected: number
  rejectionRate: number
  byReason: Record<string, number>
  byBucket: Record<FilterBucket, number>
}

export function emptyStats(): FilterStats {
  return {
    total: 0,
    passed: 0,
    rejected: 0,
    rejectionRate: 0,
    byReason: {},
    byBucket: {
      'real-estate': 0,
      'land-use-planning': 0,
      'advisory-consulting': 0,
      'economic-development': 0,
      'proptech-data': 0,
      'appraisal-valuation': 0,
      'land-based-energy': 0,
    },
  }
}

export function accumulate(stats: FilterStats, result: FilterResult): void {
  stats.total++
  if (result.pass) {
    stats.passed++
    for (const b of result.buckets) stats.byBucket[b]++
  } else {
    stats.rejected++
    const r = result.reason || 'unknown'
    stats.byReason[r] = (stats.byReason[r] || 0) + 1
  }
  stats.rejectionRate = stats.total === 0 ? 0 : stats.rejected / stats.total
}
