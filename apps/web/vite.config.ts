import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['caliphal-penni-connivent.ngrok-free.dev'],
    hmr: {
      host: 'caliphal-penni-connivent.ngrok-free.dev',
      clientPort: 443,
      protocol: 'wss',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
