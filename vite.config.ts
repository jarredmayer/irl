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
        // Precache all static build assets
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],

        // Runtime caching strategies
        runtimeCaching: [
          // Network-first for event JSON data (always try fresh)
          {
            urlPattern: /\/irl\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'event-data',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 5,
            },
          },
          // Network-first for Open-Meteo weather API
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 30, // 30 minutes
              },
              networkTimeoutSeconds: 5,
            },
          },
          // Cache-first for OpenStreetMap tiles
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Cache-first for Unsplash event images
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'event-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],

        // Offline fallback: serve the shell when navigation fails
        navigateFallback: '/irl/index.html',
        navigateFallbackDenylist: [/^\/api\//],

        // Skip waiting so updates activate immediately
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        // Enable PWA in dev so you can test install prompt locally
        enabled: true,
        type: 'module',
      },
    }),
  ],
  build: {
    outDir: 'dist',
  },
})
