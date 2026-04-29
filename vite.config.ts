import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/horion-logo.png'],
      manifest: {
        name: 'Horión',
        short_name: 'Horión',
        description: 'Tu visión. Tu ruta. Tu legado.',
        lang: 'es',
        theme_color: '#0A0204',
        background_color: '#0A0204',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/horion-logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/horion-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/horion-logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.exchangerate\.host\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fx-rates',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@data': path.resolve(__dirname, './src/data'),
    },
  },
  server: {
    host: true,
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
