import { defineConfig } from 'vite';
import { resolve } from 'path';
import compression from 'vite-plugin-compression';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json'));

export default defineConfig({
  root: '.',
  publicDir: 'public',
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
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