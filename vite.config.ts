import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import licenses from './vite-plugin-licenses';

const wasmCodecs = ['@jsquash/jpeg', '@jsquash/oxipng', '@jsquash/resize', '@jsquash/webp'];

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), licenses()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        privacy: 'privacy/index.html',
        faq: 'faq/index.html',
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // The codecs resolve their .wasm files relative to import.meta.url; pre-bundling breaks that.
    exclude: wasmCodecs,
  },
});
