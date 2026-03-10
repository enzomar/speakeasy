import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VitePWA is optional — dev works without it; only needed for production builds.
let VitePWA = null
try { ({ VitePWA } = await import('vite-plugin-pwa')) } catch { /* not installed */ }

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA && VitePWA({
      registerType: 'autoUpdate',
      // Inject SW registration into the built HTML
      injectRegister: 'auto',

      manifest: {
        name: 'SpeakEasy — AAC',
        short_name: 'SpeakEasy',
        description: 'Augmentative and Alternative Communication with on-device AI. Tap symbols to build sentences — no cloud, no account.',
        theme_color: '#3B9B8F',
        background_color: '#F5F3F0',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/?source=pwa',
        categories: ['health', 'medical', 'education', 'accessibility'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' },
        ],
      },

      workbox: {
        // Precache all built JS/CSS/HTML + small public assets
        globPatterns: ['**/*.{js,css,html,woff2,ico}', 'se.png', 'pwa-192.png', 'pwa-512.png'],

        // WASM chunks from @xenova/transformers can be >5 MB
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,

        // Don't precache pictogram images (thousands of files, fetched on demand)
        globIgnores: ['**/pictograms/**'],

        runtimeCaching: [
          // ARASAAC API responses — network-first, 7-day cache
          {
            urlPattern: /^https:\/\/api\.arasaac\.org\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'arasaac-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
            },
          },
          // Local ARASAAC pictogram PNGs — cache-first, 30-day cache
          {
            urlPattern: /\/pictograms\/arasaac\/\d+\.png/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pictograms',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // HuggingFace / model CDN — these manage their own IndexedDB cache,
          // so we use NetworkOnly to avoid double-caching huge model files.
          {
            urlPattern: /^https:\/\/(huggingface\.co|cdn-lfs\.huggingface\.co|cdn\.jsdelivr\.net)\//,
            handler: 'NetworkOnly',
          },
        ],

        // Skip waiting so updates activate immediately
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],

  // Required by @mlc-ai/web-llm (SharedArrayBuffer + WebGPU) — dev only.
  // "credentialless" still enables SharedArrayBuffer but lets @xenova/transformers
  // fetch Whisper model files from the Hugging Face CDN without CORP headers.
  server: {
    headers: {
      "Cross-Origin-Opener-Policy":   "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },

  // Allow large WASM/model chunks without warnings
  build: {
    chunkSizeWarningLimit: 50_000, // 50 MB — web-llm ships large WASM
    rollupOptions: {
      output: {
        // Split vendor bundles for better caching
        manualChunks: {
          "react-vendor":       ["react", "react-dom"],
          "transformers-vendor": ["@xenova/transformers"],
        },
      },
    },
  },

  // WebAssembly support (required for @xenova/transformers ONNX runtime)
  optimizeDeps: {
    exclude: ["@mlc-ai/web-llm"], // web-llm manages its own WASM loading
  },
})

