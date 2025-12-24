const CACHE_VERSION = '2.0.0';
const APP_CACHE = `techbros-app-${CACHE_VERSION}`;
const RESOURCE_CACHE = 'techbros-resources-v1';

const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/js/store.js',
    '/js/p2p.js',
    '/js/ui.js',
    '/manifest.json',
    '/resources.json',
    '/favicon.png',

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
    '/vendor/phosphor/Phosphor-Duotone.woff2'
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
                console.error('[SW] Installation failed:', error);
                return self.skipWaiting();
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== APP_CACHE && key !== RESOURCE_CACHE) {
                        console.log(`[SW] Cleaning old cache: ${key}`);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (event.request.headers.get('range')) {
        event.respondWith(handleRangeRequest(event.request));
        return;
    }

    if (event.request.mode === 'navigate') {
        const isResource = url.pathname.includes('/resources/');

        if (!isResource) {
            event.respondWith(
                caches.match('/index.html').then(response => {
                    return response || safeFetch(event.request);
                })
            );
            return;
        }
    }

    if (url.pathname.endsWith('/resources.json')) {
        event.respondWith(
            fetch(event.request).then(networkRes => {
                const clone = networkRes.clone();
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                    caches.open(APP_CACHE).then(cache => cache.put(event.request, clone));
                }
                return networkRes;
            }).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedRes => {
            if (cachedRes) return cachedRes;

            return safeFetch(event.request).then(networkRes => {
                if (!networkRes || networkRes.status !== 200 || networkRes.type !== 'basic') {
                    return networkRes;
                }

                const targetCache = url.pathname.includes('/resources/')
                    ? RESOURCE_CACHE
                    : APP_CACHE;

                const responseToCache = networkRes.clone();
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                    caches.open(targetCache).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return networkRes;
            });
        })
    );
});

async function handleRangeRequest(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        const blob = await cachedResponse.blob();
        const header = request.headers.get('range');
        const range = header.match(/bytes=(\d+)-(\d+)?/);

        const start = parseInt(range[1]);
        const end = range[2] ? parseInt(range[2]) : blob.size - 1;

        if (start >= blob.size) {
            return new Response('Requested range not satisfiable', { status: 416 });
        }

        const slicedBlob = blob.slice(start, end + 1);
        const headers = new Headers(cachedResponse.headers);
        headers.set('Content-Range', `bytes ${start}-${end}/${blob.size}`);
        headers.set('Content-Length', slicedBlob.size);

        return new Response(slicedBlob, {
            status: 206,
            statusText: 'Partial Content',
            headers: headers
        });
    }

    return fetch(request);
}

async function safeFetch(request) {
    try {
        const response = await fetch(request);
        if (response && response.redirected) {
            const body = response.body;
            return new Response(body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
        }
        return response;
    } catch (e) {
        throw e;
    }
}