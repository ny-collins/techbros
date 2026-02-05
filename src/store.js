import { security } from './utils/security.js';
import { errorHandler } from './utils/errorHandler.js';

class Store {
    constructor() {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        this.state = {
            version: __APP_VERSION__,
            resources: [],
            settings: {
                theme: systemTheme,
                layout: 'grid',
                lastSeen: Date.now()
            },
            pinned: [],
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
        if (!resource) {
            window.dispatchEvent(new CustomEvent('store:error', {
                detail: { 
                    message: 'Resource not found',
                    context: 'pin'
                }
            }));
            return false;
        }

        return await errorHandler.safeIDBOperation(async () => {
            const isPinned = this.state.pinned.includes(resourceId);
            const cacheName = 'techbros-resources-v1';
            const cache = await caches.open(cacheName);
            
            if (isPinned) {
                await cache.delete(resource.url);
                this.state.pinned = this.state.pinned.filter(id => id !== resourceId);
            } else {
                const response = await errorHandler.safeFetch(resource.url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch resource for caching: ${response.status} ${response.statusText}`);
                }
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

            const resourceMap = new Map();
            
            staticData.forEach(resource => {
                if (resource.id) {
                    resourceMap.set(resource.id, { ...resource, source: 'static' });
                }
            });
            
            cloudData.forEach(resource => {
                if (resource.id) {
                    resourceMap.set(resource.id, { ...resource, source: 'cloud' });
                }
            });
            
            const unified = Array.from(resourceMap.values());

            unified.sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB - dateA;
            });

            this.state.resources = unified;
            
            if (staticData.length === 0 && cloudData.length === 0) {
                window.dispatchEvent(new CustomEvent('store:error', {
                    detail: { 
                        message: 'Unable to load resources. Check your connection.',
                        context: 'fetch'
                    }
                }));
            }

        } catch (error) {
            console.error('[Store] Critical error fetching resources:', error);
        }
    }

    /* === UPLOAD CAPABILITY === */

    async uploadResource(file, pin, progressCallback) {
        let safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        safeName = safeName.replace(/_+/g, '_').substring(0, 255);

        const headers = {
            'X-Custom-Auth': pin,
            'Content-Type': 'application/json'
        };

        const MULTIPART_THRESHOLD = 10 * 1024 * 1024;
        
        if (file.size <= MULTIPART_THRESHOLD) {
            return await this._simpleUpload(file, safeName, pin, progressCallback);
        } else {
            return await this._multipartUpload(file, safeName, pin, progressCallback);
        }
    }

    async _simpleUpload(file, safeName, pin, progressCallback) {
        const url = `/api/upload?filename=${encodeURIComponent(safeName)}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'X-Custom-Auth': pin,
                'Content-Type': file.type
            },
            body: file
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Upload failed');
        }

        const result = await response.json();
        
        if (progressCallback) progressCallback(100, file.size, file.size);

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

    async _multipartUpload(file, safeName, pin, progressCallback) {
        const CHUNK_SIZE = 6 * 1024 * 1024;
        const MAX_RETRIES = 3;
        
        const headers = {
            'X-Custom-Auth': pin,
            'Content-Type': 'application/json'
        };

        let uploadId = null;
        let key = safeName;

        try {
            const initResponse = await fetch('/api/upload_init', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    filename: safeName,
                    contentType: file.type,
                    contentLength: file.size
                })
            });

            if (!initResponse.ok) {
                const error = await initResponse.json();
                throw new Error(error.error || 'Failed to initialize upload');
            }

            const initData = await initResponse.json();
            uploadId = initData.uploadId;
            key = initData.key;

            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            const uploadedParts = [];
            let uploadedBytes = 0;

            for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
                const start = (partNumber - 1) * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);

                let attempt = 0;
                let partUploaded = false;
                let lastError = null;

                while (attempt < MAX_RETRIES && !partUploaded) {
                    try {
                        const partUrl = `/api/upload_part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`;
                        
                        const partResponse = await fetch(partUrl, {
                            method: 'PUT',
                            headers: {
                                'X-Custom-Auth': pin,
                                'Content-Type': 'application/octet-stream'
                            },
                            body: chunk
                        });

                        if (!partResponse.ok) {
                            const error = await partResponse.json();
                            throw new Error(error.error || 'Part upload failed');
                        }

                        const partData = await partResponse.json();
                        uploadedParts.push({
                            partNumber: partData.partNumber,
                            etag: partData.etag
                        });

                        uploadedBytes += chunk.size;
                        partUploaded = true;

                        if (progressCallback) {
                            const progress = Math.round((uploadedBytes / file.size) * 100);
                            progressCallback(progress, uploadedBytes, file.size);
                        }

                    } catch (err) {
                        lastError = err;
                        attempt++;
                        
                        if (attempt < MAX_RETRIES) {
                            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                        }
                    }
                }

                if (!partUploaded) {
                    throw new Error(`Failed to upload part ${partNumber} after ${MAX_RETRIES} attempts: ${lastError.message}`);
                }
            }

            const completeResponse = await fetch('/api/upload_complete', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    key: key,
                    uploadId: uploadId,
                    parts: uploadedParts
                })
            });

            if (!completeResponse.ok) {
                const error = await completeResponse.json();
                throw new Error(error.error || 'Failed to complete upload');
            }

            const result = await completeResponse.json();

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

        } catch (err) {
            if (uploadId && key) {
                try {
                    await fetch('/api/upload_abort', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ key, uploadId })
                    });
                } catch (abortErr) {
                    console.error('Failed to abort upload:', abortErr);
                }
            }
            throw err;
        }
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
                this.searchWorker = new Worker(new URL('./search_worker.js', import.meta.url), { type: 'module' });
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
