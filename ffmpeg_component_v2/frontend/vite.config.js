import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'public',
    assetsDir: '', // Place assets directly in outDir
    rollupOptions: {
      input: 'src/index.js',
      output: {
        entryFileNames: 'bundle.js',
        format: 'iife',
      },
    },
    // Don't clear the public directory, as index.html is there
    emptyOutDir: false,
  },
});
