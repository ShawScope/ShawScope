// Kill-switch service worker.
//
// Replaces the previous vite-plugin-pwa (Workbox) service worker that was
// caching old HTML and causing returning visitors to see 404 / Page Not
// Found on routes that exist in the latest bundle (e.g. /consent/<token>).
//
// This worker:
//   1. Activates immediately on the next visit a returning browser makes.
//   2. Deletes the previous Workbox precache/runtime caches scoped to this
//      registration (other workers like Firebase Messaging are untouched
//      because their caches don't end with this registration's scope).
//   3. Unregisters itself, then forces all open tabs to navigate again so
//      they fetch fresh HTML directly from the network.
//
// Keep this file in place for at least one release cycle so older returning
// browsers can pick it up and self-clean. Do NOT replace with a real SW
// without going through the guarded registration wrapper described in the
// PWA skill.

function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-|supabase-api-cache/.test(name);
  return hasWorkboxBucket && name.endsWith(self.registration.scope);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const workboxCacheNames = cacheNames.filter(isWorkboxCacheForThisRegistration);
        await Promise.allSettled(workboxCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);

// Pass-through fetch — never serve from cache while we're tearing down.
self.addEventListener("fetch", () => {});