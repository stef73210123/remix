import { notFound } from 'next/navigation'
import Link from 'next/link'
import { marked } from 'marked'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import RaiseProgressBar from '@/components/deal-room/RaiseProgressBar'
import DocRenderer from '@/components/shared/DocRenderer'
import MediaGallery from '@/components/shared/MediaGallery'
import { getAssetContent } from '@/lib/gdocs/assets'
import { getAssetConfig, getConfig } from '@/lib/sheets/config'
import { getAssetMedia } from '@/lib/sheets/media'
import { formatCurrency } from '@/lib/utils/format'
import { ASSET_NAMES } from '@/types'
import type { AssetSlug } from '@/types'

export const revalidate = 60

const VALID_SLUGS: AssetSlug[] = ['livingstonfarm', 'wrenofthewoods', 'circularplatform']

const MAP_COORDS: Partial<Record<AssetSlug, { lat: number; lng: number; zoom: number }>> = {
  livingstonfarm: { lat: 41.901914, lng: -74.837076, zoom: 14 },
  wrenofthewoods: { lat: 41.1267614, lng: -73.7133056, zoom: 16 },
}

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

  const [contentResult, configResult, configMapResult, mediaResult] = await Promise.allSettled([
    getAssetContent(slug, 'public'),
    getAssetConfig(slug),
    getConfig(),
    getAssetMedia(slug),
  ])

  const content = contentResult.status === 'fulfilled' ? contentResult.value : null
  const cfg = configResult.status === 'fulfilled' ? configResult.value : null
  const configMap = configMapResult.status === 'fulfilled' ? configMapResult.value : {}
  const media = mediaResult.status === 'fulfilled' ? mediaResult.value : []
  const assetName = ASSET_NAMES[slug as AssetSlug] || slug
  const tagline = configMap[`${slug}_tagline`] || ''
  const description = configMap[`${slug}_description`] || ''
  const highlights = (configMap[`${slug}_highlights`] || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  // Convert markdown description to HTML
  const descriptionHtml = description ? marked.parse(description) as string : ''

  // Holdings: comma-separated slugs stored as config key (e.g. circularplatform_holdings)
  const holdingSlugs = (configMap[`${slug}_holdings`] || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is AssetSlug => s in ASSET_NAMES)

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
              {tagline && (
                <p className="text-lg text-muted-foreground mt-2 max-w-xl">{tagline}</p>
              )}
              {cfg && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
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

      {/* Property description */}
      {descriptionHtml && (
        <section className="border-b">
          <div className="container mx-auto max-w-4xl px-4 py-10">
            <div
              className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:tracking-tight"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        </section>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="border-b">
          <div className="container mx-auto max-w-4xl px-4 py-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Highlights</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {highlights.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Holdings */}
      {holdingSlugs.length > 0 && (
        <section className="border-b">
          <div className="container mx-auto max-w-4xl px-4 py-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">Portfolio Holdings</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {holdingSlugs.map((h) => (
                <Link key={h} href={`/assets/${h}`} className="group rounded-xl border p-5 hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <div className="font-semibold group-hover:text-primary transition-colors">{ASSET_NAMES[h]}</div>
                  <div className="text-sm text-muted-foreground mt-1">{configMap[`${h}_tagline`] || 'View asset details →'}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Photo gallery + videos */}
      <MediaGallery media={media} />

      {/* Google Doc content sections */}
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
      ) : !description && media.length === 0 ? (
        <section>
          <div className="container mx-auto max-w-4xl px-4 py-12">
            <p className="text-muted-foreground">Asset details are being prepared.</p>
          </div>
        </section>
      ) : null}

      {/* Map */}
      {MAP_COORDS[slug as AssetSlug] && (
        <section className="border-t">
          <div className="container mx-auto max-w-6xl px-4 py-10">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Location</h2>
            <div className="rounded-xl overflow-hidden border aspect-video max-h-[420px]">
              <iframe
                title={`${assetName} location`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${MAP_COORDS[slug as AssetSlug]!.lat},${MAP_COORDS[slug as AssetSlug]!.lng}&z=${MAP_COORDS[slug as AssetSlug]!.zoom}&output=embed`}
              />
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t bg-muted/20 mt-auto">
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
