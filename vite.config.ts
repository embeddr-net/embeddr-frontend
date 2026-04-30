import { URL, fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

const packageJson = JSON.parse(
  readFileSync(
    resolve(fileURLToPath(new URL('.', import.meta.url)), 'package.json'),
    'utf-8',
  ),
)

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    // devtools(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    viteReact(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon-180x180.png',
        'embeddr_logo_transparent.webp',
      ],
      manifest: {
        name: 'Embeddr',
        short_name: 'Embeddr',
        description: 'AI image management and visualization platform',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: (() => {
    // Accept both VITE_EMBEDDR_BACKEND_URL and VITE_BACKEND_URL, matching
    // what the client-typescript package reads at runtime. Without this,
    // the proxy silently targets 8003 while the app hits a different port.
    const rawTarget =
      process.env.VITE_EMBEDDR_BACKEND_URL ||
      process.env.VITE_BACKEND_URL ||
      'http://localhost:8003'
    const target = rawTarget.replace(/\/api(\/v\d+)?\/?$/, '')
    return {
      proxy: {
        '/api': { target, changeOrigin: true, ws: true },
        '/plugins': { target, changeOrigin: true },
        '/themes': { target, changeOrigin: true },
      },
    }
  })(),
})
