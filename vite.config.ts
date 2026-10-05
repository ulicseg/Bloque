/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': el service worker nuevo se descarga solo, pero no se activa hasta que la persona
      // toca "Recargar". Con 'autoUpdate' la página se recargaría sola y podría cortar una edición.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icono.svg'],
      manifest: {
        name: 'Bloques',
        short_name: 'Bloques',
        description: 'Organizá la semana en bloques alrededor de tus turnos.',
        lang: 'es-AR',
        // standalone: sin barras de Safari. El manifest admite un solo theme_color;
        // el claro/oscuro lo resuelven los <meta name="theme-color"> con media de index.html.
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        theme_color: '#f2f2f7',
        background_color: '#f2f2f7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        // App de una sola página: cualquier ruta sin conexión cae en index.html
        navigateFallback: 'index.html',
      },
    }),
  ],
  // Los tests son de lógica pura: no hace falta DOM.
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
