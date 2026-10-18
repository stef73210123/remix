/*
 * Minimal service worker — present so the browser treats the site as
 * installable, and so a reader who loses signal mid-meeting still has the last
 * pages they opened.
 *
 * Deliberately network-first, and deliberately small. A service worker is the
 * one piece of a site that can outlive a bad deploy: cache too eagerly and
 * returning visitors are served stale pages with no way to tell you. So:
 *   - the network always wins when it answers; the cache is a fallback only
 *   - /admin/api is never cached, because meeting and case data must be live
 *   - skipWaiting + clients.claim, so a corrected worker takes over on the
 *     next load rather than waiting for every tab to close
 */
const CACHE = 'onc-v1'
const OFFLINE_SAFE = /^\/(?!admin\/api\/)/

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (!OFFLINE_SAFE.test(url.pathname)) return

  e.respondWith(
    fetch(req)
      .then((res) => {
        // Only snapshot good, basic responses; opaque/partial ones poison a cache.
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(async () => {
        const hit = (await caches.match(req)) || (await caches.match('/'))
        // respondWith(undefined) surfaces as a console TypeError; when we have
        // nothing cached, answer plainly instead of looking like a bug.
        return hit || new Response('Offline — this page has not been opened on this device yet.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }),
  )
})
