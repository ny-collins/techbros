import { Peer } from 'peerjs';
import { db } from './db.js';

class ManualP2PService extends EventTarget {
    constructor() {
        super();
        this.peerConnection = null;
        this.dataChannel = null;
        this.isHost = false;
    }

    async init(isHost) {
        this.isHost = isHost;
        this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        this.peerConnection.onicecandidate = (event) => {
            if (!event.candidate) {
                const offer = JSON.stringify(this.peerConnection.localDescription);
                this.dispatchEvent(new CustomEvent('signal-ready', { detail: offer }));
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            if (this.peerConnection.connectionState === 'connected') {
                this.dispatchEvent(new Event('connected'));
            }
        };

        if (this.isHost) {
            this.dataChannel = this.peerConnection.createDataChannel('file-transfer');
            this._setupDataChannel(this.dataChannel);
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
        } else {
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this._setupDataChannel(this.dataChannel);
            };
        }
    }

    async handleSignal(signalStr) {
        try {
            const signal = JSON.parse(signalStr);
            if (this.isHost) {
                await this.peerConnection.setRemoteDescription(signal);
            } else {
                await this.peerConnection.setRemoteDescription(signal);
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);
            }
        } catch (e) {
            console.error('[Manual] Signal error:', e);
            this.dispatchEvent(new CustomEvent('error', { detail: e }));
        }
    }

    _setupDataChannel(channel) {
        channel.onopen = () => this.dispatchEvent(new Event('channel-open'));
        channel.onmessage = (event) => this.dispatchEvent(new CustomEvent('data', { detail: JSON.parse(event.data) }));
    }

    send(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data));
        }
    }
}

export class P2PService extends EventTarget {
    constructor() {
        super();
        this.peer = null;
        this.conn = null;
        this.peerId = null;
        this.mode = 'online';
        this.manualService = null;
        this.chunkSize = 64 * 1024;
        this.receivingChunks = new Map();
        this.fileStreams = new Map();
    }

    async init(customPin = null) {
        if (this.peer) this.destroy();
        this.mode = 'online';
        this.peerId = customPin || this._generatePIN();

        return new Promise((resolve, reject) => {
            this.peer = new Peer(this.peerId, {
                debug: 2,
                secure: true,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { 
                            urls: import.meta.env.VITE_TURN_URL, 
                            username: import.meta.env.VITE_TURN_USERNAME, 
                            credential: import.meta.env.VITE_TURN_CREDENTIAL 
                        }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.dispatchEvent(new CustomEvent('ready', { detail: { id, mode: 'online' } }));
                resolve(id);
            });

            this.peer.on('connection', (conn) => this._handleConnection(conn));
            
            this.peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    this.init(null).then(resolve).catch(reject);
                    return;
                }
                reject(err);
            });
        });
    }

    async initManual(isHost) {
        if (this.peer) this.destroy();
        this.mode = 'manual';
        this.manualService = new ManualP2PService();

        this.manualService.addEventListener('signal-ready', (e) => this.dispatchEvent(new CustomEvent('signal-generated', { detail: e.detail })));
        this.manualService.addEventListener('connected', () => this.dispatchEvent(new CustomEvent('connected', { detail: { peer: 'Manual Peer' } })));
        this.manualService.addEventListener('data', (e) => this._handleData(e.detail));
        
        await this.manualService.init(isHost);
    }

    async processManualSignal(signalStr) {
        if (this.manualService) await this.manualService.handleSignal(signalStr);
    }

    connect(remotePin) {
        if (this.mode === 'online' && this.peer) {
            const conn = this.peer.connect(remotePin, { reliable: true });
            this._handleConnection(conn);
        }
    }

    async sendFile(file) {
        const sendData = (data) => {
            if (this.mode === 'online' && this.conn) this.conn.send(data);
            else if (this.mode === 'manual' && this.manualService) this.manualService.send(data);
        };

        if ((this.mode === 'online' && !this.conn) || (this.mode === 'manual' && !this.manualService)) {
             this.dispatchEvent(new CustomEvent('error', { detail: { message: 'No active connection' } }));
             return;
        }

        const totalChunks = Math.ceil(file.size / this.chunkSize);
        const transferId = crypto.randomUUID();
        sendData({ type: 'meta', name: file.name, size: file.size, mime: file.type, totalChunks, transferId });

        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, file.size);
            const chunk = file.slice(start, end);
            
            let chunkData;
            if (this.mode === 'manual') {
                 chunkData = await this._blobToBase64(chunk);
            } else {
                 chunkData = await chunk.arrayBuffer();
            }

            sendData({ type: 'chunk', index: i, total: totalChunks, data: chunkData, name: file.name, transferId });

            const progress = ((i + 1) / totalChunks) * 100;
            this.dispatchEvent(new CustomEvent('send-progress', { detail: { name: file.name, progress } }));
            await new Promise(r => setTimeout(r, 10));
        }
        this.dispatchEvent(new CustomEvent('send-complete', { detail: { name: file.name } }));
    }

    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    destroy() {
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        if (this.manualService) {
            if(this.manualService.peerConnection) this.manualService.peerConnection.close();
            this.manualService = null;
        }
        this.peer = null;
        this.conn = null;
    }

    _handleConnection(conn) {
        this.conn = conn;
        conn.on('open', () => this.dispatchEvent(new CustomEvent('connected', { detail: { peer: conn.peer } })));
        conn.on('data', (data) => this._handleData(data));
        conn.on('close', () => {
            this.dispatchEvent(new Event('disconnected'));
            this.conn = null;
        });
        conn.on('error', (err) => this.dispatchEvent(new CustomEvent('error', { detail: err })));
    }

    _handleData(data) {
        if (data.type === 'chunk' && typeof data.data === 'string' && data.data.startsWith('data:')) {
             fetch(data.data).then(res => res.arrayBuffer()).then(buffer => {
                 data.data = buffer;
                 this._processChunk(data);
             });
             return;
        }
        this._processChunk(data);
    }

    async _processChunk(data) {
        if (data.type === 'meta') {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const { usage, quota } = await navigator.storage.estimate();
                if (usage + data.size > quota) {
                    this.dispatchEvent(new CustomEvent('error', { detail: { message: 'Storage quota exceeded!' } }));
                    return;
                }
            }

            try {
                if ('showSaveFilePicker' in window) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: data.name,
                        types: [{ description: 'File', accept: { [data.mime]: ['.' + data.name.split('.').pop()] } }]
                    });
                    const writable = await handle.createWritable();
                    this.fileStreams.set(data.transferId, { writable, received: 0, total: data.totalChunks, name: data.name });
                    this.dispatchEvent(new CustomEvent('transfer-start', { detail: data }));
                    return;
                }
            } catch (err) {
                console.warn('[P2P] File Picker cancelled or failed, falling back to RAM.', err);
            }

            this.receivingChunks.set(data.transferId, {
                received: 0,
                total: data.totalChunks,
                size: data.size,
                mime: data.mime,
                name: data.name
            });
            db.deleteFileChunks(data.transferId).catch(e => console.warn('Failed to clear old chunks', e));
            this.dispatchEvent(new CustomEvent('transfer-start', { detail: data }));
            return;
        }

        if (data.type === 'chunk') {
            if (this.fileStreams.has(data.transferId)) {
                const stream = this.fileStreams.get(data.transferId);
                await stream.writable.write(data.data);
                stream.received++;
                
                const progress = (stream.received / stream.total) * 100;
                this.dispatchEvent(new CustomEvent('receive-progress', { detail: { name: stream.name, progress } }));

                if (stream.received === stream.total) {
                    await stream.writable.close();
                    this.fileStreams.delete(data.transferId);
                    this.dispatchEvent(new CustomEvent('file-saved', { detail: { name: stream.name } }));
                }
                return;
            }

            const fileData = this.receivingChunks.get(data.transferId);
            if (!fileData) return;

            await db.addChunk(data.transferId, data.index, data.data);
            fileData.received++;

            const progress = (fileData.received / fileData.total) * 100;
            this.dispatchEvent(new CustomEvent('receive-progress', { detail: { name: fileData.name, progress } }));

            if (fileData.received === fileData.total) {
                const chunks = await db.getFileChunks(data.transferId);
                const blob = new Blob(chunks, { type: fileData.mime });
                const safeBlob = this._sanitizeBlob(blob, fileData.mime);
                
                if (safeBlob) {
                    this.dispatchEvent(new CustomEvent('file-received', {
                        detail: { blob: safeBlob, name: fileData.name, mime: fileData.mime }
                    }));
                }
                
                await db.deleteFileChunks(data.transferId);
                this.receivingChunks.delete(data.transferId);
            }
        }
    }

    _sanitizeBlob(blob, mimeType) {
        const allowedTypes = [
            'application/pdf', 'text/plain', 'text/markdown', 'text/html',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm', 'video/ogg',
            'application/zip', 'application/x-zip-compressed'
        ];
        return allowedTypes.includes(mimeType) ? blob : null;
    }

    _generatePIN() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }
}

export const p2p = new P2PService();