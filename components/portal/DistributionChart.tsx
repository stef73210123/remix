"use client"

import { useMemo } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Bar } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Distribution {
  date: string
  amount: number
  type: string
}

interface DistributionChartProps {
  distributions: Distribution[]
}

function getQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const q = Math.ceil((d.getMonth() + 1) / 3)
  return `Q${q} ${d.getFullYear()}`
}

export default function DistributionChart({
  distributions,
}: DistributionChartProps) {
  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {}

    // Sort by date first to maintain chronological order
    const sorted = [...distributions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    for (const d of sorted) {
      const label = getQuarterLabel(d.date)
      grouped[label] = (grouped[label] || 0) + d.amount
    }

    const labels = Object.keys(grouped)
    const data = Object.values(grouped)

    return {
      labels,
      datasets: [
        {
          label: "Distributions",
          data,
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderColor: "rgb(16, 185, 129)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }
  }, [distributions])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
            }).format(ctx.parsed.y),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) =>
            typeof value === "number"
              ? `$${value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}`
              : value,
        },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      x: {
        grid: { display: false },
      },
    },
  }

  if (distributions.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">
          Distribution History
        </h3>
        <p className="text-sm text-stone-500">No distributions recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-stone-900">
        Distribution History
      </h3>
      <div className="h-64">
        <Bar data={chartData} options={options as never} />
      </div>
    </div>
  )
}
