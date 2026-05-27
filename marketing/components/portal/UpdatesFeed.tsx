"use client"

import { useMemo } from "react"
import { formatDate } from "@/lib/utils/format"

interface Update {
  title: string
  body: string
  date: string
  author?: string
}

interface UpdatesFeedProps {
  updates: Update[]
}

export default function UpdatesFeed({ updates }: UpdatesFeedProps) {
  const sorted = useMemo(
    () =>
      [...updates].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [updates]
  )

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">
          Latest Updates
        </h3>
        <p className="text-sm text-stone-500">No updates yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-semibold text-stone-900">
        Latest Updates
      </h3>

      <div className="space-y-4">
        {sorted.map((update, i) => (
          <article
            key={`${update.title}-${i}`}
            className="rounded-lg border border-stone-100 bg-stone-50/50 p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-stone-900">
                {update.title}
              </h4>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">
              {update.body}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
              <span>{formatDate(update.date)}</span>
              {update.author && (
                <>
                  <span aria-hidden="true">&#183;</span>
                  <span>{update.author}</span>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
