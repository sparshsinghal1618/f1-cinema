import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// F1 — Vite configuration.
// - base './' keeps the production build portable (any static host / sub-path).
// - three/drei/fiber/gsap are split into a separate vendor chunk so the main
//   bundle stays small and the browser can cache vendor code independently.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['gsap'],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
});
