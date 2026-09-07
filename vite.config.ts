import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const wasmCodecs = ['@jsquash/jpeg', '@jsquash/png', '@jsquash/oxipng', '@jsquash/webp', '@jsquash/avif'];

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // The codecs resolve their .wasm files relative to import.meta.url; pre-bundling breaks that.
    exclude: wasmCodecs,
  },
});
