"use client"

import { formatDate } from "@/lib/utils/format"

interface Milestone {
  title: string
  date: string
  status: "completed" | "in-progress" | "upcoming"
  description?: string
}

interface TimelineTableProps {
  milestones: Milestone[]
}

const STATUS_CONFIG: Record<
  Milestone["status"],
  { dot: string; badge: string; label: string }
> = {
  completed: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    label: "Completed",
  },
  "in-progress": {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 ring-blue-600/20",
    label: "In Progress",
  },
  upcoming: {
    dot: "bg-stone-300",
    badge: "bg-stone-50 text-stone-600 ring-stone-500/20",
    label: "Upcoming",
  },
}

export default function TimelineTable({ milestones }: TimelineTableProps) {
  if (milestones.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">
          Project Timeline
        </h3>
        <p className="text-sm text-stone-500">No milestones available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-semibold text-stone-900">
        Project Timeline
      </h3>

      <div className="relative">
        {milestones.map((milestone, i) => {
          const config = STATUS_CONFIG[milestone.status]
          const isLast = i === milestones.length - 1

          return (
            <div key={`${milestone.title}-${i}`} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-[9px] top-5 h-full w-px bg-stone-200" />
              )}

              {/* Dot */}
              <div className="relative z-10 mt-1.5 flex shrink-0">
                <div
                  className={`h-[18px] w-[18px] rounded-full border-2 border-white ${config.dot} shadow-sm`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-stone-900">
                    {milestone.title}
                  </h4>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.badge}`}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  {formatDate(milestone.date)}
                </p>
                {milestone.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                    {milestone.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
