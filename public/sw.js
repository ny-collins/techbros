const CACHE_VERSION = 'v2.0.0';
const APP_CACHE = `techbros-app-${CACHE_VERSION}`;
const RESOURCE_CACHE = 'techbros-resources-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/resources.json',
    '/favicon.png',
    '/src/style.css',
    '/src/app.js',
    '/src/store.js',
    '/src/p2p.js',
    '/src/db.js',
    '/src/ui.js',
    '/src/search-worker.js',
    '/vendor/peerjs.min.js',
    '/vendor/pdf.worker.min.js',
    '/vendor/phosphor/regular.css',
    '/vendor/phosphor/bold.css',
    '/vendor/phosphor/fill.css',
    '/vendor/phosphor/duotone.css',
    '/vendor/phosphor/Phosphor.ttf',
    '/vendor/phosphor/Phosphor.woff',
    '/vendor/phosphor/Phosphor.woff2',
    '/vendor/phosphor/Phosphor-Duotone.ttf',
    '/vendor/phosphor/Phosphor-Duotone.woff',
    '/vendor/phosphor/Phosphor-Duotone.woff2',
    '/fonts/inter.css',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa0ZL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1pL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2pL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7SUc.woff2',
    '/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then(cache => {
                console.log(`[SW] Installing App Shell: ${CACHE_VERSION}`);
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(error => {
                console.error('[SW] Installation failed. Check paths:', error);
            })
    );
});

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

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/resources/')) {
        event.respondWith(handleResourceRequest(event.request));
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
            }).catch(() => {
            });

            return cachedRes || fetchPromise;
        })
    );
});

async function handleResourceRequest(request) {
    const cache = await caches.open(RESOURCE_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        if (request.headers.has('range')) {
            return handleRangeResponse(cachedResponse, request);
        }
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.warn('[SW] Offline resource fetch failed:', request.url);
        return new Response('Offline', { status: 503 });
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