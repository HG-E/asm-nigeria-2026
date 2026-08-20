// Minimal, deliberately conservative service worker: caches only immutable,
// content-hashed build assets (/_next/static/*) and static public images,
// so repeat visits on slow/unreliable connections load instantly instead of
// re-fetching. It NEVER intercepts navigations, RSC payloads, API routes, or
// Server Actions -- every dynamic/authenticated request always goes to the
// network untouched, so there is no risk of serving stale or wrong data to
// a logged-in author/reviewer/committee/admin session.
//
// Bump CACHE_NAME whenever the caching strategy itself changes (not on every
// deploy -- hashed asset URLs already change on their own, so old entries
// just go unused and get pruned by CACHE_MAX_ENTRIES below).
const CACHE_NAME = "asm-static-v1"
const CACHE_MAX_ENTRIES = 120

const CACHEABLE_PREFIXES = ["/_next/static/", "/icons/", "/brand/", "/speakers/"]

function isCacheable(url) {
  if (url.origin !== self.location.origin) return false
  return CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      await self.clients.claim()
    })()
  )
})

async function trimCache(cache) {
  const keys = await cache.keys()
  if (keys.length <= CACHE_MAX_ENTRIES) return
  await cache.delete(keys[0])
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)
  if (!isCacheable(url)) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(event.request)
      if (cached) return cached

      try {
        const response = await fetch(event.request)
        if (response.ok) {
          await cache.put(event.request, response.clone())
          await trimCache(cache)
        }
        return response
      } catch (err) {
        if (cached) return cached
        throw err
      }
    })()
  )
})
