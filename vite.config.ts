import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/irl/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons/*.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'IRL',
        short_name: 'IRL',
        description: 'Curated local events in Miami & Fort Lauderdale',
        start_url: '/irl/',
        scope: '/irl/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0ea5e9',
        background_color: '#f8fafc',
        lang: 'en',
        categories: ['lifestyle', 'entertainment', 'social'],
        icons: [
          {
            src: '/irl/icons/icon-72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: '/irl/icons/icon-96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/irl/icons/icon-128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: '/irl/icons/icon-144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/irl/icons/icon-152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: '/irl/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/irl/icons/icon-384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/irl/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/irl\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'event-data',
              expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: { maxEntries: 5, maxAgeSeconds: 1800 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 2592000 },
            },
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'event-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
            },
          },
        ],
        navigateFallback: '/irl/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  build: {
    outDir: 'dist',
  },
})
