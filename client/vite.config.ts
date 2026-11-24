import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Express server (server/index.js) listens on port 3000. Proxying /api to it keeps the
// browser on one origin, so no extra CORS configuration is needed during development.
const api = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
})
