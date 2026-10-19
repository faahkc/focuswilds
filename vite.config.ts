import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { pwaAssets } from './scripts/pwa-assets.ts'

export default defineConfig({
  base: '/focuswilds/',
  server: { strictPort: true },
  plugins: [react(), pwaAssets()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
