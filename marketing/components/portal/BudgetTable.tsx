"use client"

import { formatCurrency } from "@/lib/utils/format"

interface BudgetItem {
  category: string
  description: string
  budgeted: number
  actual: number
}

interface BudgetTableProps {
  items: BudgetItem[]
}

export default function BudgetTable({ items }: BudgetTableProps) {
  const totalBudgeted = items.reduce((s, i) => s + i.budgeted, 0)
  const totalActual = items.reduce((s, i) => s + i.actual, 0)
  const totalVariance = totalBudgeted - totalActual

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">
          Project Budget
        </h3>
        <p className="text-sm text-stone-500">No budget data available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-semibold text-stone-900">
        Project Budget
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left">
              <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                Category
              </th>
              <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                Description
              </th>
              <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                Budgeted
              </th>
              <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                Actual
              </th>
              <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                Variance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((item, i) => {
              const variance = item.budgeted - item.actual
              const isUnder = variance >= 0
              return (
                <tr key={`${item.category}-${i}`} className="hover:bg-stone-50">
                  <td className="py-3 pr-4 font-medium text-stone-700">
                    {item.category}
                  </td>
                  <td className="py-3 pr-4 text-stone-600">
                    {item.description}
                  </td>
                  <td className="py-3 pr-4 text-right text-stone-700">
                    {formatCurrency(item.budgeted)}
                  </td>
                  <td className="py-3 pr-4 text-right text-stone-700">
                    {formatCurrency(item.actual)}
                  </td>
                  <td
                    className={`py-3 text-right font-medium ${
                      isUnder ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {isUnder ? "+" : ""}
                    {formatCurrency(variance)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-stone-300 font-semibold">
              <td className="pt-3 pr-4 text-stone-900" colSpan={2}>
                Total
              </td>
              <td className="pt-3 pr-4 text-right text-stone-900">
                {formatCurrency(totalBudgeted)}
              </td>
              <td className="pt-3 pr-4 text-right text-stone-900">
                {formatCurrency(totalActual)}
              </td>
              <td
                className={`pt-3 text-right ${
                  totalVariance >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {totalVariance >= 0 ? "+" : ""}
                {formatCurrency(totalVariance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
