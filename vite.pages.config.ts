import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./static-site/', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public/', import.meta.url)),
  base: '/rookivo/',
  build: {
    outDir: fileURLToPath(new URL('./pages-dist/', import.meta.url)),
    emptyOutDir: true,
  },
});
