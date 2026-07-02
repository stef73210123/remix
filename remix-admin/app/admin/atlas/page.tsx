import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'

/**
 * Atlas — the CesiumJS 3D map, behind the Remix admin login.
 *
 * Served at remixcre.com/admin/atlas. Embeds the existing map deployment as a
 * full-viewport iframe; swap the iframe src if the map moves.
 *
 * Full-screen: the iframe is fixed to the whole viewport (100dvh) with no
 * surrounding chrome, so the map is truly edge-to-edge. The "← Dashboard"
 * back-nav lives inside the map itself (rendered when `embed=1`), which keeps
 * this page free of a header bar that would otherwise shrink the map.
 */
// Pinned internal Vercel URL for the remix-atlas project.
// Do NOT switch to the atlas.remixcre.com custom domain — that domain
// 301-redirects to /admin/atlas, which would loop this iframe through login.
const ATLAS_SRC = 'https://remix-atlas.vercel.app/map?embed=1&back=https%3A%2F%2Fremixcre.com%2Fadmin'

export default async function AtlasPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login')

  return (
    <iframe
      src={ATLAS_SRC}
      title="Atlas 3D Map"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        border: 0,
        display: 'block',
      }}
      allow="geolocation; fullscreen"
    />
  )
}
