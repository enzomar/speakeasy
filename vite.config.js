import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

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

