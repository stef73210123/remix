"use client"

import { formatCurrency } from "@/lib/utils/format"

interface AssetSummary {
  name: string
  invested: number
  currentValue: number
  distributions: number
}

interface PortfolioSummaryCardProps {
  assets: AssetSummary[]
}

export default function PortfolioSummaryCard({
  assets,
}: PortfolioSummaryCardProps) {
  const totalInvested = assets.reduce((s, a) => s + a.invested, 0)
  const totalCurrentValue = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalDistributions = assets.reduce((s, a) => s + a.distributions, 0)
  const totalReturn =
    totalInvested > 0
      ? ((totalCurrentValue + totalDistributions - totalInvested) /
          totalInvested) *
        100
      : 0

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-semibold text-stone-900">
        Portfolio Summary
      </h3>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total Invested
          </p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {formatCurrency(totalInvested)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Current Value
          </p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {formatCurrency(totalCurrentValue)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total Return
          </p>
          <p
            className={`mt-1 text-xl font-semibold ${
              totalReturn >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {totalReturn >= 0 ? "+" : ""}
            {totalReturn.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Distributions
          </p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {formatCurrency(totalDistributions)}
          </p>
        </div>
      </div>

      {/* Allocation bars */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-500">
          Allocation by Asset
        </p>
        <div className="space-y-3">
          {assets.map((asset) => {
            const pct =
              totalInvested > 0 ? (asset.invested / totalInvested) * 100 : 0
            return (
              <div key={asset.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-stone-700">
                    {asset.name}
                  </span>
                  <span className="text-stone-500">
                    {formatCurrency(asset.invested)} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-stone-700 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
