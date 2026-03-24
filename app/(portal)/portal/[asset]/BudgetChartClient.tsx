'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { BudgetLine } from '@/types'

interface Props {
  lines: BudgetLine[]
}

function formatTick(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md space-y-0.5">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; fill: string }, i: number) => (
        <p key={i} style={{ color: p.fill }}>
          {p.name}: <span className="font-medium">{formatTick(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function BudgetChartClient({ lines }: Props) {
  if (lines.length === 0) return null

  // Group by group field, aggregate per group
  const groups = new Map<string, { budgeted: number; actual: number; projected: number }>()
  for (const l of lines) {
    const g = l.group || 'Other'
    if (!groups.has(g)) groups.set(g, { budgeted: 0, actual: 0, projected: 0 })
    const entry = groups.get(g)!
    entry.budgeted += l.budgeted
    entry.actual += l.actual_to_date
    entry.projected += l.projected_final
  }

  const chartData = Array.from(groups.entries()).map(([name, vals]) => ({
    name,
    Budgeted: vals.budgeted,
    Actual: vals.actual,
    Projected: vals.projected,
  }))

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={formatTick} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={56} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Budgeted" fill="#94a3b8" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Actual" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Projected" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
