
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'events', 'string_decoder'],
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      protocolImports: true
    })
  ],

  // GitHub Pages repository path
  base: '/salliapp/',

  server: {
    port: 3000,
    open: true
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-xlsx': ['xlsx'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-react': ['react', 'react-dom', 'lucide-react']
        }
      }
    }
  }
});
