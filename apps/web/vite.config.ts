import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Set NGROK_HOST in your shell or .env.local when serving the dev server
// through an ngrok tunnel (e.g. for demos). Leave it unset for normal
// localhost development — overriding HMR to wss://ngrok breaks local reloads.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const ngrokHost = env.NGROK_HOST;

  return {
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
      ...(ngrokHost
        ? {
            allowedHosts: [ngrokHost],
            hmr: {
              host: ngrokHost,
              clientPort: 443,
              protocol: 'wss',
            },
          }
        : {}),
      proxy: {
        '/api': {
          target: 'http://localhost:3003',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
