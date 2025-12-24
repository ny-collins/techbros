import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const packageJson = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve('./public/index.html'),
        sw: resolve('./src/sw.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js';
        }
      },
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.message.includes('peerjs.min.js')) return;
        warn(warning);
      },
      plugins: [{
        name: 'version-replacer',
        generateBundle(options, bundle) {
          Object.keys(bundle).forEach(fileName => {
            if (fileName.includes('sw') || fileName.includes('manifest')) {
              const chunk = bundle[fileName];
              if (chunk.code) {
                chunk.code = chunk.code.replace(/__APP_VERSION__/g, packageJson.version);
              }
            }
          });
        }
      }]
    }
  },
  plugins: [{
    name: 'manifest-version-replacer',
    writeBundle() {
      // Update the main manifest.json in public folder
      const publicManifestPath = resolve('./public/manifest.json');
      if (existsSync(publicManifestPath)) {
        try {
          let manifest = readFileSync(publicManifestPath, 'utf-8');
          manifest = manifest.replace(/__APP_VERSION__/g, packageJson.version);
          writeFileSync(publicManifestPath, manifest);
        } catch (error) {
          console.warn('Could not update public/manifest.json version:', error.message);
        }
      }
      
      // Also update the built manifest in dist/assets if it exists
      const distDir = resolve('./dist');
      const assetsDir = resolve('./dist/assets');
      
      if (existsSync(assetsDir)) {
        const files = readdirSync(assetsDir);
        const manifestFile = files.find(file => file.startsWith('manifest') && file.endsWith('.json'));
        if (manifestFile) {
          const manifestPath = join(assetsDir, manifestFile);
          try {
            let manifest = readFileSync(manifestPath, 'utf-8');
            manifest = manifest.replace(/__APP_VERSION__/g, packageJson.version);
            writeFileSync(manifestPath, manifest);
          } catch (error) {
            console.warn('Could not update dist/assets manifest version:', error.message);
          }
        }
      }
    }
  }],
  server: {
    port: 3000,
    open: true
  }
});