import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ammBridge } from './bridge';

export default defineConfig({
  cacheDir: './.vite',
  plugins: [react(), ammBridge()],
  server: {
    port: 3000,
    open: true,
  },
});
