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
import { getTimeline } from '@/lib/sheets/timeline'
import { getAnnouncementsForAsset } from '@/lib/sheets/announcements'
import { TimelineGantt } from '@/components/shared/TimelineGantt'
import PropertyMap from '@/components/shared/PropertyMap'
import { formatCurrency } from '@/lib/utils/format'
import { ASSET_NAMES } from '@/types'
import type { AssetSlug } from '@/types'

export const revalidate = 60

const VALID_SLUGS: AssetSlug[] = ['livingstonfarm', 'wrenofthewoods', 'circularplatform']

const MAP_COORDS: Partial<Record<AssetSlug, { lat: number; lng: number; zoom: number; label: string }>> = {
  livingstonfarm: { lat: 41.901914, lng: -74.837076, zoom: 16, label: 'Livingston Farm' },
  wrenofthewoods: { lat: 41.1267614, lng: -73.7133056, zoom: 18, label: 'Wren of the Woods' },
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

  const [contentResult, configResult, configMapResult, mediaResult, timelineResult, announcementsResult] = await Promise.allSettled([
    getAssetContent(slug, 'public'),
    getAssetConfig(slug),
    getConfig(),
    getAssetMedia(slug),
    getTimeline(slug),
    getAnnouncementsForAsset(slug),
  ])

  const content = contentResult.status === 'fulfilled' ? contentResult.value : null
  const cfg = configResult.status === 'fulfilled' ? configResult.value : null
  const configMap = configMapResult.status === 'fulfilled' ? configMapResult.value : {}
  const media = mediaResult.status === 'fulfilled' ? mediaResult.value : []
  const timeline = timelineResult.status === 'fulfilled' ? timelineResult.value : []
  const announcements = announcementsResult.status === 'fulfilled' ? announcementsResult.value : []
  const assetName = ASSET_NAMES[slug as AssetSlug] || slug
  const heroImage = configMap[`${slug}_hero_image`] || ''
  const heroVideo = configMap[`${slug}_hero_video`] || ''
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
      <section className={`border-b relative ${(heroImage || heroVideo) ? 'overflow-hidden' : 'bg-muted/30'}`}>
        {heroVideo ? (
          <>
            {heroVideo.includes('youtube.com') || heroVideo.includes('youtu.be') ? (
              <iframe
                src={heroVideo}
                allow="autoplay; encrypted-media"
                aria-hidden="true"
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: '100vw', height: '56.25vw',
                  minHeight: '100%', minWidth: '177.78vh',
                  transform: 'translate(-50%, -50%)', border: 0,
                  pointerEvents: 'none',
                }}
              />
            ) : (
              <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" aria-hidden="true">
                <source src={heroVideo} />
              </video>
            )}
            <div className="absolute inset-0 bg-black/55" />
          </>
        ) : heroImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
            <div className="absolute inset-0 bg-black/50" />
          </>
        ) : null}
        <div className={`container mx-auto max-w-6xl px-4 py-20 relative ${(heroImage || heroVideo) ? 'text-white' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className={`text-sm mb-2 ${(heroImage || heroVideo) ? 'text-white/70' : 'text-muted-foreground'}`}>
                <Link href="/" className="hover:underline">Circular</Link>
                <span className="mx-2">/</span>
                Assets
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{assetName}</h1>
              {tagline && (
                <p className={`text-lg mt-2 max-w-xl ${(heroImage || heroVideo) ? 'text-white/80' : 'text-muted-foreground'}`}>{tagline}</p>
              )}
              {cfg && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant={(heroImage || heroVideo) ? 'secondary' : 'outline'}>{cfg.asset_type}</Badge>
                  <Badge variant={(heroImage || heroVideo) ? 'secondary' : 'outline'}>{cfg.location}</Badge>
                  <Badge>{cfg.status}</Badge>
                </div>
              )}
            </div>
            <Link href={`/request-access?asset=${slug}`}>
              <Button size="lg" variant={(heroImage || heroVideo) ? 'secondary' : 'default'}>Request Deal Room Access</Button>
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

      {/* Timeline */}
      {timeline.length > 0 && (
        <section className="border-t">
          <div className="container mx-auto max-w-6xl px-4 py-10">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Project Timeline</h2>
            <TimelineGantt milestones={timeline} staticView />
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Milestone</th>
                    <th className="text-left py-2 pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planned</th>
                    <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((m, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-6">{m.milestone}</td>
                      <td className="py-2 pr-6 text-muted-foreground">
                        {m.planned_date ? new Date(m.planned_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                        {m.planned_end_date ? ` – ${new Date(m.planned_end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                      </td>
                      <td className="py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          m.status === 'complete' ? 'bg-green-100 text-green-700' :
                          m.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          m.status === 'delayed' ? 'bg-red-100 text-red-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Map — full width, satellite */}
      {MAP_COORDS[slug as AssetSlug] && (
        <section className="border-t">
          <PropertyMap
            lat={MAP_COORDS[slug as AssetSlug]!.lat}
            lng={MAP_COORDS[slug as AssetSlug]!.lng}
            zoom={MAP_COORDS[slug as AssetSlug]!.zoom}
            label={MAP_COORDS[slug as AssetSlug]!.label}
            height={480}
            gisCounty={slug === 'livingstonfarm' ? 'sullivan' : slug === 'wrenofthewoods' ? 'westchester' : undefined}
          />
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
