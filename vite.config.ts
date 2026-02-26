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
      // Use custom SW so we can force-reload all open clients on update
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
      injectManifest: {
        // Precache all static build assets
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
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
