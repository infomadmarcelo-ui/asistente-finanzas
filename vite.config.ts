import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages sirve un repo de proyecto en /<nombre-del-repo>/, no en la raíz.
// El dev server local sigue en "/" para no cambiarte la URL de siempre.
const REPO_BASE = '/asistente-finanzas/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Asistente Personal',
        short_name: 'Asistente',
        description: 'Asistente personal con finanzas, vehículos y recordatorios',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'es-AR',
        // Sin start_url/scope: vite-plugin-pwa los arma solo a partir de `base`,
        // así el manifest queda bien tanto en local como en /asistente-finanzas/.
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Los datos son 100% locales (IndexedDB); el service worker solo cachea
        // el shell de la app para que funcione offline. Nunca cachea llamadas
        // con datos financieros porque esas llamadas no existen: la app no tiene backend.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/dolarapi\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dolar-oficial',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 6 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'clima',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 3 },
            },
          },
          {
            urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'clima-geocoding',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
}))
