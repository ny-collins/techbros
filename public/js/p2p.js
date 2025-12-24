export class P2PService extends EventTarget {
    constructor() {
        super();
        this.peer = null;
        this.conn = null;
        this.peerId = null;
        this.isHost = false;
        this.chunkSize = 64 * 1024;
        this.receivingChunks = new Map();
    }

    async init(customPin = null) {
        if (this.peer) this.destroy();

        if (typeof Peer === 'undefined') {
            await this._loadPeerJS();
        }

        this.peerId = customPin || this._generatePIN();
        this.isHost = !!customPin;

        console.log(`[P2P] Initializing with ID: ${this.peerId}`);

        return new Promise((resolve, reject) => {
            this.peer = new Peer(this.peerId, {
                debug: 2,
                secure: true,
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                console.log('[P2P] Peer Open. ID:', id);
                this.dispatchEvent(new CustomEvent('ready', { detail: { id } }));
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                console.log('[P2P] Incoming connection from:', conn.peer);
                this._handleConnection(conn);
            });

            this.peer.on('disconnected', () => {
                console.warn('[P2P] Disconnected from signaling server. Reconnecting...');
                this.peer.reconnect();
            });

            this.peer.on('error', (err) => {
                console.error('[P2P] Peer Error:', err.type, err);

                if (err.type === 'unavailable-id') {
                    console.warn('[P2P] PIN taken, generating new one...');
                    this.init(null).then(resolve).catch(reject);
                    return;
                }

                this.dispatchEvent(new CustomEvent('error', { detail: err }));
                reject(err);
            });
        });
    }

    connect(remotePin) {
        if (!this.peer) {
            console.error('[P2P] Peer not initialized');
            return;
        }

        console.log(`[P2P] Connecting to ${remotePin}...`);
        const conn = this.peer.connect(remotePin, {
            reliable: true
        });

        this._handleConnection(conn);
    }

    async sendFile(file) {
        if (!this.conn || !this.conn.open) {
            this.dispatchEvent(new CustomEvent('error', { detail: { message: 'No active connection' } }));
            return;
        }

        console.log(`[P2P] Sending file: ${file.name} (${file.size} bytes)`);

        const totalChunks = Math.ceil(file.size / this.chunkSize);

        this.conn.send({
            type: 'meta',
            name: file.name,
            size: file.size,
            mime: file.type,
            totalChunks: totalChunks
        });

        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, file.size);
            const chunk = file.slice(start, end);

            this.conn.send({
                type: 'chunk',
                index: i,
                total: totalChunks,
                data: await chunk.arrayBuffer(),
                name: file.name
            });

            const progress = ((i + 1) / totalChunks) * 100;
            this.dispatchEvent(new CustomEvent('send-progress', {
                detail: { name: file.name, progress: progress }
            }));

            await new Promise(resolve => setTimeout(resolve, 10));
        }

        console.log(`[P2P] File sent: ${file.name}`);
        this.dispatchEvent(new CustomEvent('send-complete', { detail: { name: file.name } }));
    }

    destroy() {
        if (this.conn) {
            this.conn.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.peer = null;
        this.conn = null;
    }

    _handleConnection(conn) {
        this.conn = conn;

        conn.on('open', () => {
            console.log('[P2P] Data Connection Established');
            this.dispatchEvent(new CustomEvent('connected', { detail: { peer: conn.peer } }));
        });

        conn.on('data', (data) => {
            this._handleData(data);
        });

        conn.on('close', () => {
            console.log('[P2P] Connection Closed');
            this.dispatchEvent(new Event('disconnected'));
            this.conn = null;
        });

        conn.on('error', (err) => {
            console.error('[P2P] Connection Error:', err);
            this.dispatchEvent(new CustomEvent('error', { detail: err }));
        });
    }

    _handleData(data) {
        if (data.type === 'meta') {
            console.log(`[P2P] Incoming file metadata: ${data.name} (${data.totalChunks} chunks)`);
            this.receivingChunks.set(data.name, {
                chunks: new Array(data.totalChunks),
                received: 0,
                total: data.totalChunks,
                size: data.size,
                mime: data.mime
            });
            this.dispatchEvent(new CustomEvent('transfer-start', { detail: data }));
            return;
        }

        if (data.type === 'chunk') {
            const fileData = this.receivingChunks.get(data.name);
            if (!fileData) {
                console.error('[P2P] Received chunk for unknown file:', data.name);
                return;
            }

            fileData.chunks[data.index] = data.data;
            fileData.received++;

            const progress = (fileData.received / fileData.total) * 100;
            this.dispatchEvent(new CustomEvent('receive-progress', {
                detail: { name: data.name, progress: progress }
            }));

            if (fileData.received === fileData.total) {
                console.log(`[P2P] All chunks received for ${data.name}, reassembling...`);
                const blob = new Blob(fileData.chunks, { type: fileData.mime });

                const safeBlob = this._sanitizeBlob(blob, fileData.mime);

                if (safeBlob) {
                    this.dispatchEvent(new CustomEvent('file-received', {
                        detail: {
                            blob: safeBlob,
                            name: data.name,
                            mime: fileData.mime
                        }
                    }));
                } else {
                    console.warn('[P2P] Blocked potentially unsafe file type');
                    this.dispatchEvent(new CustomEvent('error', { detail: { message: 'Security: Unsafe file type blocked' } }));
                }

                this.receivingChunks.delete(data.name);
            }
            return;
        }

        if (data.file) {
            console.log('[P2P] File received (legacy format)');

            const safeBlob = this._sanitizeBlob(data.file, data.mime);

            if (safeBlob) {
                this.dispatchEvent(new CustomEvent('file-received', {
                    detail: {
                        blob: safeBlob,
                        name: data.name,
                        mime: data.mime
                    }
                }));
            } else {
                console.warn('[P2P] Blocked potentially unsafe file type');
                this.dispatchEvent(new CustomEvent('error', { detail: { message: 'Security: Unsafe file type blocked' } }));
            }
        }
    }

    _sanitizeBlob(blob, mimeType) {
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'text/html',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'video/mp4',
            'video/webm',
            'video/ogg',
            'application/zip',
            'application/x-zip-compressed'
        ];

        if (!allowedTypes.includes(mimeType)) {
            console.warn(`[P2P] Blocked potentially unsafe file type: ${mimeType}`);
            return null;
        }

        return blob;
    }

    _generatePIN() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    async _loadPeerJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/vendor/peerjs.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load PeerJS'));
            document.head.appendChild(script);
        });
    }
}

export const p2p = new P2PService();