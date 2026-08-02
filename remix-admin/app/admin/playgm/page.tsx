import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import AdminNav from '@/app/admin/AdminNav'

/**
 * PlayGM, embedded inline in the admin shell rather than opening a new tab.
 *
 * The iframe points at the same-origin SSO hand-off (`/admin/sso/playgm`),
 * which mints a token and redirects into the PlayGM admin already
 * authenticated. playgm-server sets no frame-ancestors restriction, so it
 * embeds fine; its session cookie is SameSite=None so it survives the
 * cross-site frame. An "open in new tab" fallback is always available in case
 * a browser blocks third-party cookies.
 */
export const dynamic = 'force-dynamic'

const WORDMARK = 'https://remix-admin-omega.vercel.app/remix-wordmark.png'

export default async function PlayGMPage() {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) redirect('/admin/login')

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORDMARK} alt="Remix Properties" style={{ height: 34, display: 'block' }} />
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            PlayGM ·{' '}
            <a href="/admin/sso/playgm" target="_blank" rel="noopener noreferrer">
              open in new tab
            </a>
          </div>
        </div>
        <AdminNav />
      </header>

      <iframe
        src="/admin/sso/playgm"
        title="PlayGM Admin"
        style={{
          flex: 1,
          width: '100%',
          minHeight: '75vh',
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--panel)',
        }}
      />
    </div>
  )
}
