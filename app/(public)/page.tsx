import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import RaiseProgressBar from '@/components/deal-room/RaiseProgressBar'
import DocRenderer from '@/components/shared/DocRenderer'
import { getPlatformContent } from '@/lib/gdocs/platform'
import { getSectionHtml } from '@/lib/gdocs/parser'
import { getAssetConfig } from '@/lib/sheets/config'

export const dynamic = 'force-dynamic'

const ASSETS = [
  { slug: 'livingstonfarm', name: 'Livingston Farm' },
  { slug: 'wrenofthewoods', name: 'Wren of the Woods' },
  { slug: 'circularplatform', name: 'Circular' },
]

export default async function HomePage() {
  // Fetch in parallel, fail gracefully
  const [platformContent, lfConfig, wotConfig, cpConfig] = await Promise.allSettled([
    getPlatformContent(),
    getAssetConfig('livingstonfarm'),
    getAssetConfig('wrenofthewoods'),
    getAssetConfig('circularplatform'),
  ])

  const platform = platformContent.status === 'fulfilled' ? platformContent.value : null
  const configs = {
    livingstonfarm: lfConfig.status === 'fulfilled' ? lfConfig.value : null,
    wrenofthewoods: wotConfig.status === 'fulfilled' ? wotConfig.value : null,
    circularplatform: cpConfig.status === 'fulfilled' ? cpConfig.value : null,
  }

  const aboutHtml = platform ? getSectionHtml(platform, 'About') : ''
  const philosophyHtml = platform ? getSectionHtml(platform, 'Investment Philosophy') : ''
  const teamSection = platform?.sections.find((s) => s.heading === 'Team') || null

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero — video background */}
      <section className="relative border-b overflow-hidden" style={{ minHeight: '80vh' }}>
        {/* YouTube video background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <iframe
            src="https://www.youtube.com/embed/1_Fbu9hpAV4?autoplay=1&mute=1&loop=1&playlist=1_Fbu9hpAV4&controls=0&showinfo=0&rel=0&iv_load_policy=3&playsinline=1"
            allow="autoplay; encrypted-media"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100vw',
              height: '56.25vw',
              minHeight: '100%',
              minWidth: '177.78vh',
              transform: 'translate(-50%, -50%)',
              border: 0,
            }}
          />
        </div>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/55" />
        {/* Content */}
        <div className="relative z-10 container mx-auto max-w-6xl px-4 py-32 text-center flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
          <h1 className="text-5xl font-light tracking-widest uppercase text-white sm:text-6xl md:text-7xl" style={{ fontFamily: 'var(--font-josefin)' }}>
            Invest in a<br />Regenerative Future
          </h1>
          <p className="mt-6 text-base text-white/80 max-w-2xl mx-auto tracking-wide">
            Scalable, carbon-positive agritourism hospitality platform with institutional-grade returns.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/assets/livingstonfarm">
              <button className="border border-white text-white text-xs tracking-widest uppercase px-8 py-3 hover:bg-white/10 transition-colors" style={{ fontFamily: 'var(--font-josefin)' }}>
                Explore Assets
              </button>
            </Link>
            <Link href="/request-access">
              <button className="border border-white text-white text-xs tracking-widest uppercase px-8 py-3 hover:bg-white/10 transition-colors" style={{ fontFamily: 'var(--font-josefin)' }}>
                Request Deal Room Access
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      {aboutHtml && (
        <section className="border-b">
          <div className="container mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-light tracking-widest uppercase mb-6" style={{ fontFamily: 'var(--font-josefin)' }}>About Circular</h2>
            <DocRenderer html={aboutHtml} />
          </div>
        </section>
      )}

      {/* Portfolio */}
      <section className="border-b bg-muted/20">
        <div className="container mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-light tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-josefin)' }}>Current Portfolio</h2>
          <p className="text-muted-foreground mb-8">Active capital raises open to accredited investors.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ASSETS.map(({ slug, name }) => {
              const cfg = configs[slug as keyof typeof configs]
              return (
                <Card key={slug} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{name}</CardTitle>
                    {cfg && (
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                        <span>{cfg.asset_type}</span>
                        <span>·</span>
                        <span>{cfg.location}</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 flex-1">
                    {cfg && (
                      <>
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
                        <RaiseProgressBar
                          raiseToDate={cfg.raise_to_date}
                          raiseTarget={cfg.raise_target}
                        />
                      </>
                    )}
                    <div className="mt-auto pt-2">
                      <Link href={`/assets/${slug}`}>
                        <Button variant="outline" className="w-full">View Asset</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Investment Philosophy */}
      {philosophyHtml && (
        <section className="border-b">
          <div className="container mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-light tracking-widest uppercase mb-6" style={{ fontFamily: 'var(--font-josefin)' }}>Investment Philosophy</h2>
            <DocRenderer html={philosophyHtml} />
          </div>
        </section>
      )}

      {/* Team */}
      {teamSection && (
        <section className="border-b bg-muted/20">
          <div className="container mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-light tracking-widest uppercase mb-8" style={{ fontFamily: 'var(--font-josefin)' }}>Team</h2>
            <DocRenderer html={teamSection.html} />
          </div>
        </section>
      )}

      {/* CTA */}
      <section>
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-light tracking-widest uppercase mb-4" style={{ fontFamily: 'var(--font-josefin)' }}>Ready to learn more?</h2>
          <p className="text-muted-foreground mb-6">
            Request access to our deal room for detailed financial information and investment materials.
          </p>
          <Link href="/request-access">
            <Button size="lg">Request Deal Room Access</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
