import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Build scripts, SQL and CI config aren't part of the app; editing them
  // shouldn't reload the dev page.
  server: { watch: { ignored: ['**/scripts/**', '**/supabase/**', '**/.github/**', '**/docs/**'] } },
})
