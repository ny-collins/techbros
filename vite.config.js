import { defineConfig } from 'vite';
import { resolve } from 'path';
import compression from 'vite-plugin-compression';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [compression()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        notFound: resolve(__dirname, '404.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});