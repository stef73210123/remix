/**
 * Adapter registry + orchestrator.
 *
 * Runs all 5 state adapters in parallel with per-adapter try/catch so one
 * portal outage doesn't break the sweep. Each adapter is responsible for
 * its own throttling; the orchestrator just gathers results.
 */
import type { StateCode } from '@/lib/opportunities'
import { STATE_CODES } from '@/lib/opportunities'
import { putRfp, seedCuratedIfNeeded, type WriteAction } from '@/lib/rfp-store'
import ny from './ny'
import ct from './ct'
import nj from './nj'
import ri from './ri'
import ma from './ma'
import type { AdapterResult, IngestAdapter } from './base'
import type { FilterStats } from '@/lib/rfp-filter'

export const ADAPTERS: Record<StateCode, IngestAdapter> = {
  NY: ny,
  CT: ct,
  NJ: nj,
  RI: ri,
  MA: ma,
}

export interface StateReport {
  state: StateCode
  sourceName: string
  ok: boolean
  fetched: number
  filtered: number
  writes: Record<WriteAction, number>
  stats: FilterStats
  error?: string
}

export interface IngestReport {
  startedAt: string
  finishedAt: string
  durationMs: number
  seed: { seeded: boolean; count: number }
  states: StateReport[]
}

/**
 * Run adapters in parallel with per-state isolation. Never throws.
 */
export async function runIngest(only?: StateCode[]): Promise<IngestReport> {
  const startedAt = new Date().toISOString()
  const t0 = Date.now()

  const seed = await seedCuratedIfNeeded().catch(() => ({ seeded: false, count: 0 }))

  const targets = only && only.length > 0 ? only : STATE_CODES

  const settled = await Promise.allSettled(
    targets.map(async (state) => {
      const adapter = ADAPTERS[state]
      let result: AdapterResult
      try {
        result = await adapter.ingest()
      } catch (e) {
        result = {
          ok: false,
          records: [],
          stats: {
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
          },
          fetched: 0,
          error: e instanceof Error ? e.message : String(e),
        }
      }

      const writes: Record<WriteAction, number> = {
        created: 0,
        updated: 0,
        'url-upgraded': 0,
        preserved: 0,
        unchanged: 0,
      }
      for (const rec of result.records) {
        try {
          const wr = await putRfp(rec)
          writes[wr.action]++
        } catch {
          // Persist errors ignored per-record; overall state stays ok.
        }
      }

      const report: StateReport = {
        state,
        sourceName: adapter.sourceName,
        ok: result.ok,
        fetched: result.fetched,
        filtered: result.records.length,
        writes,
        stats: result.stats,
        ...(result.error ? { error: result.error } : {}),
      }
      return report
    }),
  )

  const states: StateReport[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value
    const target = targets[i]
    return {
      state: target,
      sourceName: ADAPTERS[target].sourceName,
      ok: false,
      fetched: 0,
      filtered: 0,
      writes: { created: 0, updated: 0, 'url-upgraded': 0, preserved: 0, unchanged: 0 },
      stats: {
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
      },
      error: s.reason instanceof Error ? s.reason.message : String(s.reason),
    }
  })

  const finishedAt = new Date().toISOString()
  return { startedAt, finishedAt, durationMs: Date.now() - t0, seed, states }
}
