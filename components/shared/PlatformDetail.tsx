import { marked } from 'marked'
import DocRenderer from '@/components/shared/DocRenderer'
import MediaGallery from '@/components/shared/MediaGallery'
import RaiseProgressBar from '@/components/deal-room/RaiseProgressBar'
import { TimelineGantt } from '@/components/shared/TimelineGantt'
import { getAssetContent } from '@/lib/gdocs/assets'
import { getAssetConfig, getConfig } from '@/lib/sheets/config'
import { getAssetMedia } from '@/lib/sheets/media'
import { getTimeline } from '@/lib/sheets/timeline'
import { formatCurrency } from '@/lib/utils/format'

const SLUG = 'circularplatform'

/**
 * The full Circular Platform content (stats, description, highlights, media,
 * doc sections, timeline) — the same content as /assets/circularplatform,
 * rendered inline so it can live on the public home page below the hero.
 */
export default async function PlatformDetail() {
  const [contentResult, configResult, configMapResult, mediaResult, timelineResult] =
    await Promise.allSettled([
      getAssetContent(SLUG, 'public'),
      getAssetConfig(SLUG),
      getConfig(),
      getAssetMedia(SLUG),
      getTimeline(SLUG),
    ])

  const content = contentResult.status === 'fulfilled' ? contentResult.value : null
  const cfg = configResult.status === 'fulfilled' ? configResult.value : null
  const configMap = configMapResult.status === 'fulfilled' ? configMapResult.value : {}
  const media = mediaResult.status === 'fulfilled' ? mediaResult.value : []
  const timeline = timelineResult.status === 'fulfilled' ? timelineResult.value : []

  const description = configMap[`${SLUG}_description`] || ''
  const descriptionHtml = description ? (marked.parse(description) as string) : ''
  const highlights = (configMap[`${SLUG}_highlights`] || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <>
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

      {/* Description */}
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

      {/* Photo gallery + videos */}
      <MediaGallery media={media} />

      {/* Google Doc content sections */}
      {content && content.sections.length > 0 && (
        <section>
          <div className="container mx-auto max-w-4xl px-4 py-12 space-y-12">
            {content.sections.map((section, idx) => (
              <div key={idx}>
                <DocRenderer html={`<h2>${section.heading}</h2>${section.html}`} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <section className="border-t">
          <div className="container mx-auto max-w-6xl px-4 py-10">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Project Timeline</h2>
            <TimelineGantt milestones={timeline} staticView />
          </div>
        </section>
      )}
    </>
  )
}
