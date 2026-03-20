import { headers } from 'next/headers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import DocRenderer from '@/components/shared/DocRenderer'
import { getPlatformContent } from '@/lib/gdocs/platform'
import { getAssetContent } from '@/lib/gdocs/assets'
import { getAssetUpdates } from '@/lib/gdocs/updates'
import { ASSET_NAMES, ASSET_SLUGS } from '@/types'

export const revalidate = 0

export default async function AdminContentPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role')

  if (role !== 'admin') {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    )
  }

  const [platformResult, ...assetResults] = await Promise.allSettled([
    getPlatformContent(),
    ...ASSET_SLUGS.flatMap((slug) => [
      getAssetContent(slug, 'public').then((c) => ({ slug, type: 'public' as const, content: c })),
      getAssetContent(slug, 'dealroom').then((c) => ({ slug, type: 'dealroom' as const, content: c })),
      getAssetUpdates(slug).then((updates) => ({ slug, type: 'updates' as const, updates })),
    ]),
  ])

  const platform = platformResult.status === 'fulfilled' ? platformResult.value : null

  type AssetEntry = {
    public: Awaited<ReturnType<typeof getAssetContent>> | null
    dealroom: Awaited<ReturnType<typeof getAssetContent>> | null
    updates: Awaited<ReturnType<typeof getAssetUpdates>>
  }

  const assetData: Record<string, AssetEntry> = {}
  for (const slug of ASSET_SLUGS) {
    assetData[slug] = { public: null, dealroom: null, updates: [] }
  }

  for (const result of assetResults) {
    if (result.status !== 'fulfilled') continue
    const val = result.value as
      | { slug: string; type: 'public' | 'dealroom'; content: Awaited<ReturnType<typeof getAssetContent>> }
      | { slug: string; type: 'updates'; updates: Awaited<ReturnType<typeof getAssetUpdates>> }

    if (val.type === 'updates') {
      assetData[val.slug].updates = val.updates
    } else {
      assetData[val.slug][val.type] = val.content
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Content Preview</h1>
        <p className="text-muted-foreground mt-1">
          Live preview of Google Docs content rendered in the platform
        </p>
      </div>

      <Tabs defaultValue="platform">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="platform">Platform Overview</TabsTrigger>
          {ASSET_SLUGS.map((slug) => (
            <span key={slug} className="contents">
              <TabsTrigger value={`${slug}-public`}>
                {ASSET_NAMES[slug]} · Public
              </TabsTrigger>
              <TabsTrigger value={`${slug}-dealroom`}>
                {ASSET_NAMES[slug]} · Deal Room
              </TabsTrigger>
              <TabsTrigger value={`${slug}-updates`}>
                {ASSET_NAMES[slug]} · Updates
              </TabsTrigger>
            </span>
          ))}
        </TabsList>

        {/* Platform overview */}
        <TabsContent value="platform">
          <div className="rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-semibold">Platform Overview</h2>
              <Badge variant="outline">{platform?.sections.length ?? 0} sections</Badge>
            </div>
            {platform ? (
              <div className="space-y-8">
                {platform.sections.map((section, idx) => (
                  <div key={idx}>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Section {idx + 1} · H{section.level}
                    </div>
                    <DocRenderer html={`<h${section.level}>${section.heading}</h${section.level}>${section.html}`} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Could not load platform content. Check that GDOC_PLATFORM_OVERVIEW_ID is set and the document is shared with the service account.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Asset content tabs */}
        {ASSET_SLUGS.map((slug) => (
          <span key={slug} className="contents">
            <TabsContent value={`${slug}-public`}>
              <div className="rounded-lg border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-semibold">{ASSET_NAMES[slug]} · Public Content</h2>
                  <Badge variant="outline">{assetData[slug].public?.sections.length ?? 0} sections</Badge>
                </div>
                {assetData[slug].public ? (
                  <div className="space-y-8">
                    {assetData[slug].public!.sections.map((section, idx) => (
                      <div key={idx}>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                          Section {idx + 1} · H{section.level}
                        </div>
                        <DocRenderer html={`<h${section.level}>${section.heading}</h${section.level}>${section.html}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No public content found. Check GDOC_{slug.toUpperCase()}_PUBLIC_ID env var.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value={`${slug}-dealroom`}>
              <div className="rounded-lg border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-semibold">{ASSET_NAMES[slug]} · Deal Room Content</h2>
                  <Badge variant="outline">{assetData[slug].dealroom?.sections.length ?? 0} sections</Badge>
                </div>
                {assetData[slug].dealroom ? (
                  <div className="space-y-8">
                    {assetData[slug].dealroom!.sections.map((section, idx) => (
                      <div key={idx}>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                          Section {idx + 1} · H{section.level}
                        </div>
                        <DocRenderer html={`<h${section.level}>${section.heading}</h${section.level}>${section.html}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No deal room content found. Check GDOC_{slug.toUpperCase()}_DEALROOM_ID env var.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value={`${slug}-updates`}>
              <div className="rounded-lg border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-semibold">{ASSET_NAMES[slug]} · Investor Updates</h2>
                  <Badge variant="outline">{assetData[slug].updates.length} updates</Badge>
                </div>
                {assetData[slug].updates.length > 0 ? (
                  <div className="space-y-8">
                    {assetData[slug].updates.map((update, idx) => (
                      <div key={idx} className="border-b last:border-0 pb-8 last:pb-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                          Update {idx + 1}
                        </div>
                        <h3 className="font-semibold mb-3">{update.heading}</h3>
                        <DocRenderer html={update.html} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No updates found. Check GDOC_{slug.toUpperCase()}_UPDATES_ID env var.
                  </p>
                )}
              </div>
            </TabsContent>
          </span>
        ))}
      </Tabs>
    </div>
  )
}
