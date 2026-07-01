import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // "@shared/x" -> "../shared/x" so web (and later mobile) share one design system.
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    // Allow Vite to read files from the parent dir (where shared/ lives).
    fs: { allow: ['..'] },
  },
})
