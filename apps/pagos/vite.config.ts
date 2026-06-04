import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  server: {
    host: true,
    port: 5175,
    // Proxy /v1 to the orchestrator so the frontend stays same-origin. Needed
    // because getUserMedia only works on HTTPS (which basicSsl enables) and
    // browsers then block fetches from https:// pages to http:// backends as
    // "mixed content".
    proxy: {
      // Pagos (PUSH + PULL) — api-pagos directo.
      '/v1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Resto de microservicios (auth, users, kyc, wallet) — orchestrator.
      // Si no está corriendo, login/KYC fallan; el flujo de pagos no lo necesita.
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
});
