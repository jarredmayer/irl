import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Use /irl/ for GitHub Pages, / for Vercel
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const base = isGitHubPages ? '/irl/' : '/';

// https://vite.dev/config/
export default defineConfig({
  base,
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
        name: 'IRL Miami',
        short_name: 'IRL',
        description: 'Curated local events in Miami & Fort Lauderdale',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1a1a2e',
        background_color: '#ffffff',
        lang: 'en',
        categories: ['lifestyle', 'entertainment', 'social'],
        icons: [
          {
            src: `${base}icons/icon-72.png`,
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-96.png`,
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-128.png`,
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-144.png`,
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-152.png`,
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${base}icons/icon-384.png`,
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-512.png`,
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
            // Event data - network first, fall back to cache
            urlPattern: /\/data\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'event-data',
              expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Weather API
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: { maxEntries: 5, maxAgeSeconds: 1800 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Map tiles - cache first (they don't change)
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 2592000 },
            },
          },
          {
            // Unsplash images - cache first
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'event-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
            },
          },
          {
            // Other external images - stale while revalidate
            urlPattern: /^https:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'external-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
            },
          },
        ],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api\//],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false, // Disable in dev for faster reloads
        type: 'module',
      },
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          'vendor-date': ['date-fns', 'date-fns-tz'],
        },
      },
    },
  },
})
