import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import RaiseProgressBar from '@/components/deal-room/RaiseProgressBar'
import DocRenderer from '@/components/shared/DocRenderer'
import { getAssetContent } from '@/lib/gdocs/assets'
import { getAssetConfig } from '@/lib/sheets/config'
import { formatCurrency } from '@/lib/utils/format'
import { ASSET_NAMES } from '@/types'
import type { AssetSlug } from '@/types'

export const revalidate = 60

const VALID_SLUGS: AssetSlug[] = ['livingstonfarm', 'wrenofthewoods']

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }))
}

export default async function AssetPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (!VALID_SLUGS.includes(slug as AssetSlug)) {
    notFound()
  }

  const [contentResult, configResult] = await Promise.allSettled([
    getAssetContent(slug, 'public'),
    getAssetConfig(slug),
  ])

  const content = contentResult.status === 'fulfilled' ? contentResult.value : null
  const cfg = configResult.status === 'fulfilled' ? configResult.value : null
  const assetName = ASSET_NAMES[slug as AssetSlug] || slug

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">
                <Link href="/" className="hover:underline">Circular</Link>
                <span className="mx-2">/</span>
                Assets
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{assetName}</h1>
              {cfg && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline">{cfg.asset_type}</Badge>
                  <Badge variant="outline">{cfg.location}</Badge>
                  <Badge>{cfg.status}</Badge>
                </div>
              )}
            </div>
            <Link href={`/request-access?asset=${slug}`}>
              <Button size="lg">Request Deal Room Access</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Key stats */}
      {cfg && (
        <section className="border-b">
          <div className="container mx-auto max-w-6xl px-4 py-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Target IRR</div>
                <div className="text-xl font-semibold">{cfg.target_irr}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Multiple</div>
                <div className="text-xl font-semibold">{cfg.target_multiple}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Hold Period</div>
                <div className="text-xl font-semibold">{cfg.hold_period}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Asset Type</div>
                <div className="text-xl font-semibold">{cfg.asset_type}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Location</div>
                <div className="text-xl font-semibold">{cfg.location}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Minimum</div>
                <div className="text-xl font-semibold">{formatCurrency(cfg.minimum, true)}</div>
              </div>
            </div>
            <div className="mt-6 max-w-sm">
              <RaiseProgressBar raiseToDate={cfg.raise_to_date} raiseTarget={cfg.raise_target} />
            </div>
          </div>
        </section>
      )}

      {/* Content sections */}
      {content && content.sections.length > 0 ? (
        <section>
          <div className="container mx-auto max-w-4xl px-4 py-12 space-y-12">
            {content.sections.map((section, idx) => (
              <div key={idx}>
                <DocRenderer html={`<h2>${section.heading}</h2>${section.html}`} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="container mx-auto max-w-4xl px-4 py-12">
            <p className="text-muted-foreground">Asset details are being prepared.</p>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
          <h2 className="text-xl font-semibold mb-3">Interested in investing?</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Request access to the deal room for full financial details, the PPM, and investment terms.
          </p>
          <Link href={`/request-access?asset=${slug}`}>
            <Button size="lg">Request Deal Room Access</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
