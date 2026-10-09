import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const currentBuildTime = new Date().toISOString();

function versionPlugin() {
  return {
    name: 'version-generator',
    buildStart() {
      const versionData = {
        version: '1.2.0',
        buildTime: currentBuildTime,
        timestamp: Date.now()
      };
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(publicDir, 'version.json'),
        JSON.stringify(versionData, null, 2)
      );
    }
  };
}

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
        // Permitir explícitamente en Safari / iPadOS para evitar bloqueos de preflight
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, OPTIONS, HEAD';
        proxyRes.headers['access-control-allow-headers'] = '*';
      });
    }
  },
  '/media-proxy': {
    target: 'https://media.redgifs.com',
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/media-proxy/, ''),
    headers: {
      'Referer': 'https://www.redgifs.com/',
      'Origin': 'https://www.redgifs.com'
    },
    configure: (proxy: any) => {
      proxy.on('proxyRes', (proxyRes: any) => {
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, HEAD, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = '*';
      });
    }
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(currentBuildTime)
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    cors: true,
    proxy: proxyConfig
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    cors: true,
    proxy: proxyConfig
  }
});
