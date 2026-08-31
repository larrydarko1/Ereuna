import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    // Dev server runs on HTTP; Traefik will terminate TLS in production.
    port: 3500,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:5500',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://localhost:8000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src') // Add alias for src directory
    }
  },
  build: {
    outDir: 'dist',
    // Ensure assets are properly referenced for mobile
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
})