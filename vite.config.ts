import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    port: 443,
    host: 'localhost',
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'certs/localhost-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/localhost-cert.pem'))
    },
    proxy: {
      '/api': {
        target: 'https://localhost:5500',
        changeOrigin: true,
        secure: false, // allow self-signed certs
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src') // Add alias for src directory
    }
  },
  build: {},
})