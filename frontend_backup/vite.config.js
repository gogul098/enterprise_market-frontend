import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    allowedHosts: [
      'rockshack.duckdns.org',
      'subacute-killian-understatedly.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok.io',
      '.ngrok.app',
    ],
    hmr: {
      clientPort: 443,
    },
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
          });
        },
      },
    },
  },
  preview: {
    allowedHosts: ['rockshack.duckdns.org']
  }
})
