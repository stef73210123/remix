/**
 * Shared auth helper for municipal endpoints.
 *
 * Accepts:
 *   - Admin session cookie (interactive)
 *   - Bearer CRON_SECRET       (Vercel Cron header)
 *   - Bearer MUNICIPAL_INGEST_TOKEN (used by agents / scripts to trigger ingest)
 *
 * The third path exists because Vercel's env pull redacts `CRON_SECRET`
 * (it's flagged sensitive), which makes it impossible to hit the ingest
 * endpoint from outside a Vercel Cron header. MUNICIPAL_INGEST_TOKEN is a
 * separate, non-sensitive-flagged env var scoped only to municipal
 * endpoints, so we can rotate it without touching production cron jobs.
 */
import { cookies, headers } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isOpen } from '@/lib/flavor'

/**
 * Authorize a READ-ONLY municipal endpoint. On the public OpenNorthCastle
 * deployment these are open to everyone; everywhere else they require the same
 * auth as any other municipal endpoint. Mutation/admin endpoints (ingest,
 * purge, officials-refresh) must keep using authorizeMunicipal() so they stay
 * protected even on the public site.
 */
export async function authorizeMunicipalRead(): Promise<boolean> {
  if (isOpen) return true
  return authorizeMunicipal()
}

export async function authorizeMunicipal(): Promise<boolean> {
  const h = await headers()
  const auth = h.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const ingestToken = process.env.MUNICIPAL_INGEST_TOKEN
  if (auth) {
    if (cronSecret && auth === `Bearer ${cronSecret}`) return true
    if (ingestToken && auth === `Bearer ${ingestToken}`) return true
  }
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  return !!session
}
