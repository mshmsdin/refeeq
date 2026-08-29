import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/rafeeq/',
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Accessible from local network (phones / tablets / OBS)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  }
});
