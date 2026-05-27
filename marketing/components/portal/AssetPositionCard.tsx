"use client"

import { formatCurrency } from "@/lib/utils/format"

interface AssetPositionCardProps {
  assetName: string
  investedAmount: number
  currentValue: number
  ownership: number
  distributions: number
}

export default function AssetPositionCard({
  assetName,
  investedAmount,
  currentValue,
  ownership,
  distributions,
}: AssetPositionCardProps) {
  const gainLoss = currentValue - investedAmount
  const gainLossPct = investedAmount > 0 ? (gainLoss / investedAmount) * 100 : 0
  const isPositive = gainLoss >= 0

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-900">{assetName}</h3>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
          {ownership.toFixed(2)}% ownership
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Invested
          </p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {formatCurrency(investedAmount)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Current Value
          </p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {formatCurrency(currentValue)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Gain / Loss
          </p>
          <p
            className={`mt-1 text-xl font-semibold ${
              isPositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(gainLoss)}{" "}
            <span className="text-sm font-medium">
              ({isPositive ? "+" : ""}
              {gainLossPct.toFixed(1)}%)
            </span>
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Distributions Received
          </p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {formatCurrency(distributions)}
          </p>
        </div>
      </div>
    </div>
  )
}
