import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { getVersion } from './scripts/version.mjs'

// https://vite.dev/config/
export default defineConfig({
  base: '/focuswilds/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __APP_VERSION__: JSON.stringify(getVersion()) },
})
