'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import UploadForm from './UploadForm'
import type { InvestorDocument } from '@/types'

const ASSET_NAMES: Record<string, string> = {
  livingstonfarm: 'Livingston Farm',
  wrenofthewoods: 'Wren of the Woods',
}

const DOC_TYPE_LABELS: Record<string, string> = {
  ppm: 'PPM',
  operating_agreement: 'Operating Agreement',
  k1: 'K-1',
  quarterly_report: 'Quarterly Report',
  other: 'Other',
}

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<InvestorDocument[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/documents')
      if (res.ok) {
        const data = await res.json()
        setDocs(data.documents || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-1">Upload and manage investor documents</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <UploadForm onSuccess={fetchDocs} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Documents ({docs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground px-6 py-4">Loading...</p>
            ) : docs.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">No documents uploaded yet.</p>
            ) : (
              <div className="divide-y">
                {docs.map((doc) => (
                  <div key={doc.id} className="px-6 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.doc_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ASSET_NAMES[doc.asset] || doc.asset} · {doc.date} · {doc.email === 'all' ? 'All investors' : doc.email}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</Badge>
                      <Badge variant="secondary" className="text-xs">{doc.visible_to.toUpperCase()}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
