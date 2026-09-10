import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    // grapesjs (with backbone + codemirror + underscore) is ~1.1MB minified and
    // lands in its own chunk, loaded only on the authenticated builder route.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          grapesjs: ['grapesjs', 'grapesjs-blocks-basic'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ['.zyad.test', 'localhost', '127.0.0.1'],

    hmr: {
      host: 'app.zyad.test',
      protocol: 'ws',
    },
  },
})
