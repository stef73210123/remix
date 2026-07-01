import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'

/**
 * Atlas — the CesiumJS 3D map, behind the Remix admin login.
 * Embeds the existing map deployment; swap the iframe src if the map moves.
 */
// Pinned internal Vercel URL for the remix-atlas project.
// Do NOT switch to the atlas.remix.properties custom domain — that domain
// 301-redirects to /admin/atlas, which would loop this iframe through login.
const ATLAS_SRC = 'https://remix-atlas.vercel.app/map'

export default async function AtlasPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel)',
        }}
      >
        <a href="/admin" className="muted" style={{ fontSize: 14 }}>
          ← Dashboard
        </a>
        <strong style={{ fontSize: 14 }}>Atlas</strong>
      </div>
      <iframe
        src={ATLAS_SRC}
        title="Atlas 3D Map"
        style={{ flex: 1, width: '100%', border: 0 }}
        allow="geolocation; fullscreen"
      />
    </div>
  )
}
