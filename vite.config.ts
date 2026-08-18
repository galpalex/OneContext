import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rolldownOptions: {
      output: {
        /**
         * Split the long-lived dependencies away from application code.
         *
         * These change only when we upgrade them, so keeping them in their own
         * chunks means a normal app change no longer invalidates the whole
         * download. Supabase is worth isolating on its own: it is the largest
         * single dependency and it moves on a different cadence from React.
         */
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
