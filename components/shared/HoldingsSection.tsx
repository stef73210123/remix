import { marked } from 'marked'
import { getConfig } from '@/lib/sheets/config'
import type { AssetSlug } from '@/types'

type HoldingCard = {
  slug: AssetSlug
  name: string
  tagline: string
  hero: string
  heroAlt: string
}

const HOLDINGS: HoldingCard[] = [
  {
    slug: 'livingstonfarm',
    name: 'Livingston Farm',
    tagline: '121 regenerative acres in the Catskills',
    hero: '/img/holdings/livingstonfarm/livingstonfarm-hero.jpg',
    heroAlt: 'Livingston Farm — rolling fields with the Catskill mountains beyond',
  },
  {
    slug: 'wrenofthewoods',
    name: 'Flybrook',
    tagline: 'One kitchen, two rooms — downtown Armonk and the farm',
    hero: '/img/holdings/flybrook/flybrook-armonk.jpg',
    heroAlt: 'A Flybrook long-table farm dinner at Livingston Farm',
  },
]

/**
 * Underlying Holdings — two cards below PlatformDetail on the home page and
 * the /assets/circularplatform deep-link. Each card renders the Sheet-driven
 * description and highlights for the holding.
 */
export default async function HoldingsSection() {
  const configMap = await getConfig().catch(
    () => ({} as Record<string, string>)
  )

  const cards = HOLDINGS.map((h) => {
    const description = configMap[`${h.slug}_description`] || ''
    return {
      ...h,
      descriptionHtml: description
        ? (marked.parse(description) as string)
        : '',
      highlights: (configMap[`${h.slug}_highlights`] || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }
  })

  return (
    <section className="border-b bg-muted/20">
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          Underlying Holdings
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {cards.map((card) => (
            <article
              key={card.slug}
              className="flex flex-col overflow-hidden rounded-2xl border bg-background"
            >
              <div className="relative aspect-[16/9] w-full bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.hero}
                  alt={card.heroAlt}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {card.name}
                  </h3>
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    {card.tagline}
                  </p>
                </div>
                {card.descriptionHtml && (
                  <div
                    className="prose prose-sm max-w-none prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: card.descriptionHtml }}
                  />
                )}
                {card.highlights.length > 0 && (
                  <ul className="mt-2 grid grid-cols-1 gap-2">
                    {card.highlights.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
