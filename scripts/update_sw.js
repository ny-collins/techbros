import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* === CONSTANTS === */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SW_PATH = path.join(DIST_DIR, 'sw.js');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');

/* === MAIN LOGIC === */

console.log('🚧 Updating Service Worker assets...');

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
const appVersion = `v${pkg.version}-${Date.now().toString().slice(-6)}`;

const assets = fs.readdirSync(path.join(DIST_DIR, 'assets'));
const cssFile = assets.find(f => (f.startsWith('main-') || f.startsWith('style-')) && f.endsWith('.css'));
const jsFile = assets.find(f => f.startsWith('main-') && f.endsWith('.js'));
const workerFile = assets.find(f => f.startsWith('search_worker-') && f.endsWith('.js'));

if (!cssFile || !jsFile) {
    console.error('❌ Could not find build assets in dist/assets/');
    process.exit(1);
}

console.log(`   Found JS: ${jsFile}`);
console.log(`   Found CSS: ${cssFile}`);

let swContent = fs.readFileSync(SW_PATH, 'utf-8');

swContent = swContent
    .replace("'/src/style.css'", `'/assets/${cssFile}'`)
    .replace("'/src/app.js'", `'/assets/${jsFile}'`)
    .replace("const CACHE_VERSION = 'v3.0.0';", `const CACHE_VERSION = '${appVersion}';`);

if (workerFile) {
    swContent = swContent.replace("'/src/search_worker.js'", `'/assets/${workerFile}'`);
}

fs.writeFileSync(SW_PATH, swContent);

console.log(`✅ Service Worker updated: ${appVersion}`);
