import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src') } },
  optimizeDeps: { entries: ['index.html'] },
  server: {
    host: '127.0.0.1',
    port: 7011,
    strictPort: true,
    proxy: {
      '/api/github': {
        target: process.env.DEV_API_TARGET || 'http://127.0.0.1:7012',
        changeOrigin: true,
      },
      '/v1': { target: process.env.DEV_API_TARGET || 'http://127.0.0.1:7012', changeOrigin: true },
    },
  },
  build: { chunkSizeWarningLimit: 800 },
});
