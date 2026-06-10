import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Docker bind mounts on Windows do not propagate inotify events — polling is required for HMR.
const dockerDev = process.env.CHOKIDAR_USEPOLLING === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    ...(dockerDev && {
      watch: { usePolling: true, interval: 1000 },
      hmr: { host: 'localhost', port: 5173, clientPort: 5173 },
    }),
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Same-origin proxy so the browser (incl. Cursor Simple Browser) can reach
      // the Companion App on the host without cross-origin fetch to :37428.
      '/companion': {
        target: process.env.VITE_COMPANION_PROXY_TARGET ?? 'http://127.0.0.1:37428',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/companion/, ''),
        // Long pulls + SSE — do not time out or buffer the launch stream.
        timeout: 0,
        proxyTimeout: 0,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache'
              proxyRes.headers['x-accel-buffering'] = 'no'
              delete proxyRes.headers['content-length']
            }
          })
        },
      },
    },
  },
})
