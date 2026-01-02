/* === CONFIGURATION === */

const CACHE_VERSION = 'v3.0.0';
const APP_CACHE = `techbros-app-${CACHE_VERSION}`;
const RESOURCE_CACHE = 'techbros-resources-v1';
const MAX_RESOURCE_CACHE_SIZE = 50; // Max number of cached resources
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const CRITICAL_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.png',
    '/src/style.css',
    '/src/app.js',
    '/fonts/inter.css'
];

const OPTIONAL_ASSETS = [
    '/resources.json',
    '/src/search-worker.js',
    '/vendor/phosphor/regular.css',
    '/vendor/phosphor/bold.css',
    '/vendor/phosphor/fill.css',
    '/vendor/phosphor/duotone.css',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa0ZL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1pL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2pL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2'
];

const ON_DEMAND_ASSETS = [
    '/vendor/peerjs.min.js',
    '/vendor/pdf.worker.min.js',
    '/vendor/phosphor/Phosphor.ttf',
    '/vendor/phosphor/Phosphor.woff',
    '/vendor/phosphor/Phosphor.woff2',
    '/vendor/phosphor/Phosphor-Duotone.ttf',
    '/vendor/phosphor/Phosphor-Duotone.woff',
    '/vendor/phosphor/Phosphor-Duotone.woff2'
];

/* === INSTALLATION === */

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then(async cache => {
                console.log(`[SW] Installing critical assets: ${CACHE_VERSION}`);
                
                // Cache critical assets first
                await cache.addAll(CRITICAL_ASSETS);
                
                // Try to cache optional assets (non-blocking)
                try {
                    await cache.addAll(OPTIONAL_ASSETS);
                    console.log('[SW] Optional assets cached successfully');
                } catch (error) {
                    console.warn('[SW] Some optional assets failed to cache:', error);
                }
            })
            .then(() => self.skipWaiting())
            .catch(error => {
                console.error('[SW] Installation failed:', error);
            })
    );
});

/* === ACTIVATION === */

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== APP_CACHE && key !== RESOURCE_CACHE) {
                        console.log('[SW] Clearing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

/* === CACHE MANAGEMENT === */

async function cleanupResourceCache() {
    try {
        const cache = await caches.open(RESOURCE_CACHE);
        const requests = await cache.keys();
        
        if (requests.length <= MAX_RESOURCE_CACHE_SIZE) return;
        
        const entries = await Promise.all(
            requests.map(async request => {
                const response = await cache.match(request);
                const date = response?.headers.get('date');
                return { request, date: date ? new Date(date) : new Date(0) };
            })
        );
        
        entries.sort((a, b) => a.date - b.date);
        const toDelete = entries.slice(0, entries.length - MAX_RESOURCE_CACHE_SIZE);
        
        await Promise.all(toDelete.map(entry => cache.delete(entry.request)));
        console.log(`[SW] Cleaned up ${toDelete.length} old cached resources`);
    } catch (error) {
        console.error('[SW] Cache cleanup failed:', error);
    }
}

async function cacheOnDemandAsset(request) {
    if (!ON_DEMAND_ASSETS.some(asset => request.url.includes(asset))) return null;
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(APP_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn('[SW] Failed to cache on-demand asset:', error);
        return null;
    }
}

/* === FETCH HANDLING === */

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (!url.protocol.startsWith('http')) return;

    // Handle Cloudflare CDN (R2) requests
    if (url.pathname.startsWith('/cdn/') || url.pathname.startsWith('/resources/')) {
        event.respondWith(handleResourceRequest(event.request));
        return;
    }

    if (url.pathname.startsWith('/api/') || url.pathname.endsWith('/resources.json')) {
        event.respondWith(handleApiRequest(event.request));
        return;
    }

    // Handle on-demand assets
    if (ON_DEMAND_ASSETS.some(asset => url.pathname.includes(asset))) {
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || cacheOnDemandAsset(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedRes => {
            const fetchPromise = fetch(event.request).then(networkRes => {
                if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
                    const clone = networkRes.clone();
                    caches.open(APP_CACHE).then(cache => cache.put(event.request, clone));
                }
                return networkRes;
            }).catch(() => null);

            return cachedRes || fetchPromise;
        })
    );
});

/* === API STRATEGY (Network First) === */

async function handleApiRequest(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            const cache = await caches.open(APP_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] API offline, falling back to cache');
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response(JSON.stringify([]), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}

/* === RESOURCE STRATEGIES === */

async function handleResourceRequest(request) {
    // Open the resource cache (populated manually by 'Pin' action)
    const cache = await caches.open(RESOURCE_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        if (request.headers.has('range')) {
            return handleRangeResponse(cachedResponse, request);
        }
        return cachedResponse;
    }

    // Network Fallback (Do NOT cache automatically)
    try {
        const response = await fetch(request);
        
        // Periodically cleanup cache (every ~20 requests)
        if (Math.random() < 0.05) {
            cleanupResourceCache().catch(console.warn);
        }
        
        return response;
    } catch (error) {
        console.warn('[SW] Offline resource fetch failed:', request.url);
        return new Response('Offline - File not pinned', { status: 503 });
    }
}

async function handleRangeResponse(response, request) {
    const blob = await response.blob();
    const rangeHeader = request.headers.get('range');
    const range = rangeHeader.match(/bytes=(\d+)-(\d+)?/);

    if (!range) return response;

    const start = parseInt(range[1]);
    const end = range[2] ? parseInt(range[2]) : blob.size - 1;

    if (start >= blob.size) {
        return new Response('Requested range not satisfiable', { status: 416 });
    }

    const sliced = blob.slice(start, end + 1);
    const headers = new Headers(response.headers);
    headers.set('Content-Range', `bytes ${start}-${end}/${blob.size}`);
    headers.set('Content-Length', sliced.size);

    return new Response(sliced, {
        status: 206,
        statusText: 'Partial Content',
        headers: headers
    });
}
