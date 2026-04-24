import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using PostCSS strategy for Tailwind v4 stability in this environment
export default defineConfig({
  plugins: [react()],
})
