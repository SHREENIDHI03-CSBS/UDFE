import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend stays on its own port (4000 by default) and serves JSON only.
// In development every API path is proxied so the browser sees a same-origin
// app; in production set VITE_API_BASE to the deployed API origin instead.
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/risk-score': { target: BACKEND, changeOrigin: true },
      '/health': { target: BACKEND, changeOrigin: true },
    },
  },
});
