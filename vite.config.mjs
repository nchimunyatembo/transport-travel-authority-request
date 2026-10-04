import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.PORT || '3000';
  const apiTarget = env.VITE_API_TARGET || `http://localhost:${apiPort}`;

  return {
    root: 'public',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/uploads': { target: apiTarget, changeOrigin: true }
      }
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true
    }
  };
});