import { defineConfig } from 'vite'

// In production (GitHub Pages at /photo-games/) use the repo subpath as base.
// In dev keep '/' so the sandbox preview works normally.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/photo-games/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    strictPort: true,
  },
}))
