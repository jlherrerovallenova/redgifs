import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/redgifs': {
        target: 'https://api.redgifs.com/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/redgifs/, ''),
        headers: {
          'Referer': 'https://www.redgifs.com/',
          'Origin': 'https://www.redgifs.com'
        }
      }
    }
  }
});
