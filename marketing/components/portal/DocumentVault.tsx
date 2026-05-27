"use client"

import { useMemo } from "react"
import { formatDate } from "@/lib/utils/format"

interface Document {
  name: string
  url: string
  category: string
  date: string
}

interface DocumentVaultProps {
  documents: Document[]
}

const CATEGORY_ORDER = ["Legal", "Financial", "Updates"]

const CATEGORY_ICONS: Record<string, string> = {
  Legal: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  Financial: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  Updates: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
}

const DEFAULT_ICON =
  "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"

export default function DocumentVault({ documents }: DocumentVaultProps) {
  const grouped = useMemo(() => {
    const map: Record<string, Document[]> = {}
    for (const doc of documents) {
      const cat = doc.category || "Other"
      if (!map[cat]) map[cat] = []
      map[cat].push(doc)
    }
    // Sort categories: known order first, then others
    const sorted = Object.entries(map).sort(([a], [b]) => {
      const ia = CATEGORY_ORDER.indexOf(a)
      const ib = CATEGORY_ORDER.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
    return sorted
  }, [documents])

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">
          Document Vault
        </h3>
        <p className="text-sm text-stone-500">No documents available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-semibold text-stone-900">
        Document Vault
      </h3>

      <div className="space-y-6">
        {grouped.map(([category, docs]) => (
          <div key={category}>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
              {category}
            </h4>
            <ul className="divide-y divide-stone-100">
              {docs.map((doc, i) => (
                <li key={`${doc.name}-${i}`}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-stone-50"
                  >
                    <svg
                      className="h-5 w-5 shrink-0 text-stone-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={CATEGORY_ICONS[category] || DEFAULT_ICON}
                      />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-800">
                        {doc.name}
                      </p>
                      <p className="text-xs text-stone-400">
                        {formatDate(doc.date)}
                      </p>
                    </div>
                    <svg
                      className="h-4 w-4 shrink-0 text-stone-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
