import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7000,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
        // remove /api prefix when forwarding
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
