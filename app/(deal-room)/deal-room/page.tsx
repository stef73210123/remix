import { headers } from 'next/headers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import RaiseProgressBar from '@/components/deal-room/RaiseProgressBar'
import { getAssetConfig } from '@/lib/sheets/config'
import { ASSET_NAMES } from '@/types'
import type { AssetSlug } from '@/types'

export default async function DealRoomPage() {
  const headersList = await headers()
  const userAssets = headersList.get('x-user-assets')?.split(',').filter(Boolean) || []
  const role = headersList.get('x-user-role') || ''

  // admin/gp see all assets; dealroom/lp see only their assigned ones
  const assetsToShow: AssetSlug[] =
    role === 'admin' || role === 'gp'
      ? ['livingstonfarm', 'wrenofthewoods']
      : (userAssets as AssetSlug[])

  const configs = await Promise.allSettled(
    assetsToShow.map((slug) => getAssetConfig(slug).then((c) => ({ slug, config: c })))
  )

  const assetData = configs
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<{ slug: AssetSlug; config: ReturnType<typeof getAssetConfig> extends Promise<infer T> ? T : never }>).value)

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Deal Room</h1>
        <p className="text-muted-foreground mt-1">
          Confidential investment materials for authorized parties only.
        </p>
      </div>

      {assetData.length === 0 ? (
        <p className="text-muted-foreground">No assets are currently available for your account.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {assetData.map(({ slug, config: cfg }) => (
            <Card key={slug} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{ASSET_NAMES[slug]}</CardTitle>
                  <Badge>{cfg.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{cfg.asset_type} · {cfg.location}</div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 flex-1">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Target IRR</div>
                    <div className="font-semibold">{cfg.target_irr}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Multiple</div>
                    <div className="font-semibold">{cfg.target_multiple}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Hold</div>
                    <div className="font-semibold">{cfg.hold_period}</div>
                  </div>
                </div>
                <RaiseProgressBar raiseToDate={cfg.raise_to_date} raiseTarget={cfg.raise_target} />
                <div className="mt-auto pt-2">
                  <Link href={`/deal-room/${slug}`}>
                    <Button className="w-full">View Deal</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
