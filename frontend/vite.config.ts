import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The API is reached same-origin through the proxy below, so the client never makes a
// cross-origin request and the dev port is not load-bearing: honour an assigned PORT and
// fall back to 5173. `strictPort` makes a collision fail loudly rather than letting Vite
// drift to 5174 while whatever launched it still watches the port it asked for.
const port = Number(process.env.PORT) || 5173

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.LATTICE_API_URL ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
