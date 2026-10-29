import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { addRoute, cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache, precache } from 'workbox-precaching'

// Activate each deployment immediately and take over existing PWA windows.
self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()

// Always fetch the current app shell while online so HTML cannot point to
// hashed CSS/JS assets from a different Vercel deployment. Keep the precached
// shell as the offline fallback for installed clients.
precache(self.__WB_MANIFEST)
const offlineAppShell = createHandlerBoundToURL('index.html')

// Prefer the current deployment's hashed styles/scripts online. If the phone
// is offline, fall back to the matching version already in the precache.
registerRoute(({ request, url }) => (
  url.origin === self.location.origin && ['style', 'script'].includes(request.destination)
), async ({ request }) => {
  try {
    const response = await fetch(request)
    if (response.ok) return response
  } catch {
    // Continue with the matching precached asset when the network is unavailable.
  }
  return await matchPrecache(request.url) || Response.error()
})

registerRoute(new NavigationRoute(async ({ event, request }) => {
  try {
    const response = await fetch(request)
    if (response.ok) return response
  } catch {
    // Fall back to the versioned precache when the device is offline.
  }
  return offlineAppShell({ event, request })
}))
addRoute()
