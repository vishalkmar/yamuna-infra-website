import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite + React (JSX, no TypeScript). Dev server proxies /api to the existing
// Express backend (../infra/server) so the admin portal and the mobile app
// share one backend + database.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
