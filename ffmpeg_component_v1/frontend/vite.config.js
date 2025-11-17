import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: 'public/index.html'
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
