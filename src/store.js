import { security } from './utils/security.js';
import { errorHandler } from './utils/errorHandler.js';

class Store {
    constructor() {
        this.state = {
            version: __APP_VERSION__,
            resources: [],
            settings: {
                theme: 'dark',
                layout: 'grid',
                lastSeen: Date.now()
            },
            pinned: [], // Array of resource IDs
            user: {
                peerId: null,
                pin: null
            }
        };
    }

    /* === INITIALIZATION === */

    async init() {
        this._loadSettings();
        this._loadPinned();
        await this._fetchResources();
        console.log('[Store] Initialized with', this.state.resources.length, 'resources.');
    }

    /* === PINNING LOGIC === */

    _loadPinned() {
        const saved = localStorage.getItem('techbros_pinned');
        if (saved) {
            try {
                this.state.pinned = JSON.parse(saved);
            } catch (e) {
                this.state.pinned = [];
            }
        }
    }

    _savePinned() {
        localStorage.setItem('techbros_pinned', JSON.stringify(this.state.pinned));
    }

    async togglePin(resourceId) {
        const resource = this.state.resources.find(r => r.id === resourceId);
        if (!resource) return false;

        return await errorHandler.safeIDBOperation(async () => {
            const isPinned = this.state.pinned.includes(resourceId);
            const cacheName = 'techbros-resources-v1';
            const cache = await caches.open(cacheName);
            
            if (isPinned) {
                await cache.delete(resource.url);
                this.state.pinned = this.state.pinned.filter(id => id !== resourceId);
            } else {
                const response = await errorHandler.safeFetch(resource.url);
                await cache.put(resource.url, response);
                this.state.pinned.push(resourceId);
            }

            this._savePinned();
            return !isPinned;
        }, 'Pin Toggle');
    }

    isPinned(resourceId) {
        return this.state.pinned.includes(resourceId);
    }

    getPinnedResources() {
        return this.state.resources.filter(r => this.state.pinned.includes(r.id));
    }

    async _fetchResources() {
        try {
            const staticPromise = errorHandler.safeFetch('/resources.json', { 
                cache: 'no-cache'
            })
                .then(res => res.json())
                .catch(error => {
                    console.warn('[Store] Static resources fetch failed:', error.message);
                    return [];
                });

            const cloudPromise = errorHandler.safeFetch('/api/list', {
                cache: 'no-cache'
            })
                .then(res => res.json())
                .catch(error => {
                    console.warn('[Store] Cloud resources fetch failed:', error.message);
                    return [];
                });

            const [staticData, cloudData] = await Promise.all([
                errorHandler.safePromise(staticPromise, []),
                errorHandler.safePromise(cloudPromise, [])
            ]);

            const unified = [...staticData, ...cloudData];

            unified.sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB - dateA;
            });

            this.state.resources = unified;

        } catch (error) {
            console.error('[Store] Critical error fetching resources:', error);
        }
    }

    /* === UPLOAD CAPABILITY === */

    async uploadResource(file, pin) {
        const headers = {
            'X-Custom-Auth': pin,
            'Content-Type': file.type
        };

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const url = `/api/upload?filename=${encodeURIComponent(safeName)}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: file
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Upload failed');
        }

        const result = await response.json();

        const newResource = {
            id: result.key,
            title: result.key.split('.')[0].replace(/_/g, ' '),
            type: this._determineType(file.name),
            url: `/cdn/${result.key}`,
            size: file.size,
            date: new Date().toISOString(),
            isCloud: true,
            added: new Date().toISOString()
        };

        this.state.resources.unshift(newResource);
        return newResource;
    }

    _determineType(filename) {
        if (filename.endsWith('.pdf')) return 'pdf';
        if (filename.match(/\.(mp3|wav|ogg)$/)) return 'audio';
        if (filename.match(/\.(mp4|webm|ogv)$/)) return 'video';
        if (filename.match(/\.(jpg|png|webp|jpeg|gif|svg)$/)) return 'image';
        if (filename.match(/\.(zip|rar|7z|tar|gz)$/)) return 'archive';
        if (filename.match(/\.(txt|md|html|css|js|json)$/)) return 'text';
        if (filename.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) return 'document';
        return 'unknown';
    }

    /* === STATE MANAGEMENT === */

    _loadSettings() {
        const saved = localStorage.getItem('techbros_settings');
        if (saved) {
            try {
                this.state.settings = { ...this.state.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.warn('[Store] Corrupt settings cleared.');
                localStorage.removeItem('techbros_settings');
            }
        }
    }

    _saveSettings() {
        localStorage.setItem('techbros_settings', JSON.stringify(this.state.settings));
    }

    getResources() {
        return this.state.resources;
    }

    getVersion() {
        return this.state.version;
    }

    getSettings() {
        return this.state.settings;
    }

    updateSetting(key, value) {
        if (key in this.state.settings) {
            this.state.settings[key] = value;
            this._saveSettings();
        }
    }

    setUserPeerId(id, pin) {
        this.state.user.peerId = id;
        this.state.user.pin = pin;
    }

    /* === SEARCH LOGIC === */

    search(query) {
        return new Promise((resolve) => {
            const sanitizedQuery = security.sanitizeSearchQuery(query);
            if (!sanitizedQuery) {
                resolve(this.state.resources);
                return;
            }

            if (typeof Worker === 'undefined') {
                const lowerQ = sanitizedQuery.toLowerCase();
                const MAX_DISTANCE = 3;

                const results = this.state.resources.filter(item => {
                    const title = item.title.toLowerCase();

                    if (title.includes(lowerQ)) return true;
                    if (item.description && item.description.toLowerCase().includes(lowerQ)) return true;

                    if (lowerQ.length > 2) {
                        const dist = this._levenshtein(lowerQ, title);
                        if (dist <= MAX_DISTANCE) return true;
                    }

                    return false;
                });

                resolve(results);
                return;
            }

            if (!this.searchWorker) {
                this.searchWorker = new Worker(new URL('./search-worker.js', import.meta.url), { type: 'module' });
            }

            this.searchWorker.postMessage({
                query: sanitizedQuery,
                resources: this.state.resources
            });

            this.searchWorker.onmessage = (e) => {
                resolve(e.data.results);
            };
        });
    }

    /* === UTILITIES === */

    _levenshtein(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }
}

export const store = new Store();
