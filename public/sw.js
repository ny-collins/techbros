const CACHE_VERSION = '1.5.9';
const CACHE_NAME = `techbros-v${CACHE_VERSION}`;
const RESOURCES_CACHE = 'techbros-resources';

// Files to cache immediately (The App Shell)
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/utils.js',
    '/manifest.json',
    '/favicon.png',
    '/vendor/pdf.worker.min.js',
    '/vendor/phosphor/regular.css',
    '/vendor/phosphor/duotone.css',
    '/vendor/phosphor/Phosphor.woff2',
    '/vendor/phosphor/Phosphor.woff',
    '/vendor/phosphor/Phosphor.ttf',
    '/vendor/phosphor/Phosphor-Duotone.woff2',
    '/vendor/phosphor/Phosphor-Duotone.woff',
    '/vendor/phosphor/Phosphor-Duotone.ttf',
    'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
];

// 1. INSTALL EVENT (Cache the Shell)
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching App Shell');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => {
            // Skip waiting to activate immediately
            console.log('[Service Worker] Skip waiting - activating now');
            return self.skipWaiting();
        })
    );
});

// 2. ACTIVATE EVENT (Clean up old caches)
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // Delete old caches except current and resources cache
                if (key !== CACHE_NAME && key !== RESOURCES_CACHE && key.startsWith('techbros')) {
                    console.log('[Service Worker] Deleting old cache:', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        }).then(() => {
            // Notify all clients that update is complete
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        version: CACHE_VERSION
                    });
                });
            });
        })
    );
});

// 3. FETCH EVENT (Intercept Network Requests)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Strategy for resources.json: Network-First (to get latest updates)
    if (url.pathname === '/resources.json') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Clone before using to update cache
                    const clonedResponse = networkResponse.clone();
                    // Update cache with fresh data
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // Strategy for media files in /resources/: Cache-on-demand with separate cache
    if (url.pathname.startsWith('/resources/')) {
        event.respondWith(
            caches.open(RESOURCES_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    // Return cached version if found
                    if (response) {
                        return response;
                    }
                    
                    // Otherwise fetch and cache
                    return fetch(event.request).then((networkResponse) => {
                        // Only cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Strategy for everything else: Cache-First with network fallback
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            
            return fetch(event.request).then((networkResponse) => {
                // Optionally cache new requests for app shell files
                if (event.request.method === 'GET' && !url.pathname.includes('chrome-extension')) {
                    const clonedResponse = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                }
                return networkResponse;
            });
        }).catch(() => {
            // Return offline page if available
            if (event.request.destination === 'document') {
                return caches.match('/index.html');
            }
        })
    );
});