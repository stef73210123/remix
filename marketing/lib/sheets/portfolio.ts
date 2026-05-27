import { getInvestorPositionsForUser } from './investors'
import type { PortfolioSummary, InvestorPosition } from '@/types'

function weightedAverage(
  positions: InvestorPosition[],
  valueKey: keyof InvestorPosition,
  weightKey: keyof InvestorPosition
): number {
  const totalWeight = positions.reduce((s, p) => s + (p[weightKey] as number), 0)
  if (totalWeight === 0) return 0
  const weightedSum = positions.reduce(
    (s, p) => s + (p[valueKey] as number) * (p[weightKey] as number),
    0
  )
  return weightedSum / totalWeight
}

/**
 * Returns aggregated portfolio summary for a user.
 * All computation server-side — never returns raw sheet data.
 */
export async function getUserPortfolioSummary(email: string): Promise<PortfolioSummary> {
  const positions = await getInvestorPositionsForUser(email)

  return {
    total_invested: positions.reduce((s, p) => s + p.equity_invested, 0),
    total_nav: positions.reduce((s, p) => s + p.nav_estimate, 0),
    total_distributions: positions.reduce((s, p) => s + p.distributions_total, 0),
    irr_blended: weightedAverage(positions, 'irr_estimate', 'equity_invested'),
    positions,
  }
}
