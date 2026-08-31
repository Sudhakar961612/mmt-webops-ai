import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies API + demo-page requests to the Express backend on :5000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/demo': { target: 'http://localhost:5000', changeOrigin: true },
      '/health': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
