/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

// Precache all build assets (manifest injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Serve the app shell for all navigation requests
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/irl/index.html'), {
    denylist: [/^\/api\//],
  }),
)

// Network-first for event JSON data
registerRoute(
  /\/irl\/.*\.json$/,
  new NetworkFirst({
    cacheName: 'event-data',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 86400 })],
  }),
)

// Network-first for weather API
registerRoute(
  /^https:\/\/api\.open-meteo\.com\/.*/,
  new NetworkFirst({
    cacheName: 'weather-api',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 1800 })],
  }),
)

// Cache-first for map tiles
registerRoute(
  /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
  new CacheFirst({
    cacheName: 'map-tiles',
    plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 2592000 })],
  }),
)

// Cache-first for images
registerRoute(
  /^https:\/\/images\.unsplash\.com\/.*/,
  new CacheFirst({
    cacheName: 'event-images',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 604800 })],
  }),
)

// Skip waiting so a new SW activates the moment it's installed
self.addEventListener('install', () => {
  self.skipWaiting()
})

// After taking control, navigate all open windows to reload fresh content.
// client.navigate() works on the old page without needing any listener there.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() =>
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) =>
          Promise.all(
            clients.map((client) =>
              (client as WindowClient).navigate(client.url),
            ),
          ),
        ),
    ),
  )
})
