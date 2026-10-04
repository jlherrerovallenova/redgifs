import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyConfig = {
  '/api/redgifs': {
    target: 'https://api.redgifs.com/v2',
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/api\/redgifs/, ''),
    headers: {
      'Referer': 'https://www.redgifs.com/',
      'Origin': 'https://www.redgifs.com'
    },
    configure: (proxy: any) => {
      proxy.on('proxyRes', (proxyRes: any) => {
        // Eliminar cabeceras CORS devueltas por RedGIFs para evitar conflictos de origen en el navegador
        delete proxyRes.headers['access-control-allow-origin'];
        delete proxyRes.headers['access-control-allow-credentials'];
        delete proxyRes.headers['access-control-allow-methods'];
        delete proxyRes.headers['access-control-allow-headers'];
      });
    }
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: proxyConfig
  },
  preview: {
    port: 3000,
    host: true,
    proxy: proxyConfig
  }
});
