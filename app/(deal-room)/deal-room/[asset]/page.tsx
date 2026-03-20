import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import DocRenderer from '@/components/shared/DocRenderer'
import RaiseProgressBar from '@/components/deal-room/RaiseProgressBar'
import { getAssetContent } from '@/lib/gdocs/assets'
import { getAssetConfig } from '@/lib/sheets/config'
import { getSharedDealDocuments } from '@/lib/sheets/documents'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { ASSET_NAMES } from '@/types'
import type { AssetSlug } from '@/types'

const VALID_SLUGS: AssetSlug[] = ['livingstonfarm', 'wrenofthewoods']

export default async function DealRoomAssetPage({
  params,
}: {
  params: Promise<{ asset: string }>
}) {
  const { asset } = await params

  if (!VALID_SLUGS.includes(asset as AssetSlug)) {
    notFound()
  }

  const headersList = await headers()
  const role = headersList.get('x-user-role') || ''
  const userAssets = headersList.get('x-user-assets')?.split(',').filter(Boolean) || []

  // Access check for lp/dealroom roles
  if (role !== 'admin' && role !== 'gp' && !userAssets.includes(asset)) {
    notFound()
  }

  const [contentResult, configResult, docsResult] = await Promise.allSettled([
    getAssetContent(asset, 'dealroom'),
    getAssetConfig(asset),
    getSharedDealDocuments(asset),
  ])

  const content = contentResult.status === 'fulfilled' ? contentResult.value : null
  const cfg = configResult.status === 'fulfilled' ? configResult.value : null
  const docs = docsResult.status === 'fulfilled' ? docsResult.value : []
  const assetName = ASSET_NAMES[asset as AssetSlug] || asset

  const adminEmail = process.env.ADMIN_EMAIL || 'info@circular.enterprises'

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-2 text-sm text-muted-foreground">
        <Link href="/deal-room" className="hover:underline">Deal Room</Link>
        <span className="mx-2">/</span>
        {assetName}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{assetName}</h1>
          {cfg && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{cfg.asset_type}</Badge>
              <Badge>{cfg.status}</Badge>
            </div>
          )}
        </div>
        <a href={`mailto:${adminEmail}?subject=Investment Interest — ${assetName}`}>
          <Button>Express Interest</Button>
        </a>
      </div>

      {/* Key terms */}
      {cfg && (
        <div className="mb-8 rounded-lg border p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Key Terms</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-4">
            <div>
              <div className="text-xs text-muted-foreground">Target IRR</div>
              <div className="font-semibold">{cfg.target_irr}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Equity Multiple</div>
              <div className="font-semibold">{cfg.target_multiple}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Hold Period</div>
              <div className="font-semibold">{cfg.hold_period}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Minimum Investment</div>
              <div className="font-semibold">{formatCurrency(cfg.minimum, true)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Location</div>
              <div className="font-semibold">{cfg.location}</div>
            </div>
          </div>
          <RaiseProgressBar raiseToDate={cfg.raise_to_date} raiseTarget={cfg.raise_target} />
        </div>
      )}

      {/* Deal room content */}
      {content && content.sections.length > 0 ? (
        <div className="space-y-10">
          {content.sections.map((section, idx) => (
            <div key={idx}>
              {idx > 0 && <Separator className="mb-10" />}
              <DocRenderer html={`<h2>${section.heading}</h2>${section.html}`} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-8">Deal room content is being prepared.</p>
      )}

      {/* Documents */}
      {docs.length > 0 && (
        <div className="mt-12">
          <Separator className="mb-8" />
          <h2 className="text-lg font-semibold mb-4">Documents</h2>
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{doc.doc_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{doc.doc_type.replace('_', ' ')} · {formatDate(doc.date)}</div>
                </div>
                <a href={`/api/sheets/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">Download</Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
      {docs.length === 0 && (
        <div className="mt-12">
          <Separator className="mb-8" />
          <p className="text-muted-foreground text-sm">Documents will be available here once uploaded.</p>
        </div>
      )}
    </div>
  )
}
