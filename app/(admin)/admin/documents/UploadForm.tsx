'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ASSETS = [
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
  { slug: 'circularplatform', name: 'Circular Platform' },
]

const DOC_TYPES = [
  { value: 'ppm', label: 'PPM' },
  { value: 'operating_agreement', label: 'Operating Agreement' },
  { value: 'k1', label: 'K-1' },
  { value: 'quarterly_report', label: 'Quarterly Report' },
  { value: 'other', label: 'Other' },
]

const VISIBILITY = [
  { value: 'lp', label: 'LP (all investors)' },
  { value: 'gp', label: 'GP & Admin only' },
  { value: 'admin', label: 'Admin only' },
]

export default function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [asset, setAsset] = useState('livingstonfarm')
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('other')
  const [visibleTo, setVisibleTo] = useState('lp')
  const [email, setEmail] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); if (!docName) setDocName(f.name.replace(/\.[^.]+$/, '')) }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f) { setFile(f); if (!docName) setDocName(f.name.replace(/\.[^.]+$/, '')) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('asset', asset)
      fd.append('doc_name', docName)
      fd.append('doc_type', docType)
      fd.append('visible_to', visibleTo)
      if (email.trim()) fd.append('email', email.trim())

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }
      setSuccess(true)
      setFile(null)
      setDocName('')
      setEmail('')
      setTimeout(() => { setSuccess(false); onSuccess() }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
            {file ? (
              <div>
                <Badge variant="secondary" className="text-sm">{file.name}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Drag & drop a file here, or click to browse</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Asset */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Asset</label>
              <select value={asset} onChange={(e) => setAsset(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {ASSETS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
              </select>
            </div>

            {/* Doc type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Document Type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Doc name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Document Name</label>
              <input value={docName} onChange={(e) => setDocName(e.target.value)} required placeholder="e.g. Q1 2025 Report" className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
            </div>

            {/* Visible to */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Visible To</label>
              <select value={visibleTo} onChange={(e) => setVisibleTo(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {VISIBILITY.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Investor email */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
              Specific Investor Email <span className="normal-case font-normal">(leave blank to share with all)</span>
            </label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="investor@example.com" className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Uploaded successfully!</p>}

          <Button type="submit" disabled={!file || uploading} className="w-full">
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
