import { Peer } from 'peerjs';
import { db } from './db.js';
import { integrity } from './utils/integrity.js';
import { errorHandler } from './utils/errorHandler.js';

/* === CONSTANTS === */

const CHUNK_SIZE = 64 * 1024;
const BUFFER_THRESHOLD = 1024 * 1024;
const HEARTBEAT_INTERVAL = 5000;
const ALLOWED_MIME_TYPES = [
    'application/pdf', 'text/plain', 'text/markdown', 'text/html',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm', 'video/ogg',
    'application/zip', 'application/x-zip-compressed'
];

/* === MANUAL SIGNALING SERVICE === */

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
            await this.peerConnection.setRemoteDescription(signal);

            if (!this.isHost && signal.type === 'offer') {
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);
            }
        } catch (e) {
            console.error('[Manual] Signal error:', e);
            this.dispatchEvent(new CustomEvent('error', { detail: { message: 'Invalid QR Code' } }));
        }
    }

    _setupDataChannel(channel) {
        channel.onopen = () => this.dispatchEvent(new Event('channel-open'));
        channel.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                this.dispatchEvent(new CustomEvent('data', { detail: parsed }));
            } catch (e) {
                console.error('Failed to parse manual message', e);
            }
        };
    }

    send(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data));
        }
    }
}

/* === MAIN P2P SERVICE === */

export class P2PService extends EventTarget {
    constructor() {
        super();
        this.peer = null;
        this.conn = null;
        this.peerId = null;
        this.mode = 'online';
        this.manualService = null;
        this.receivingChunks = new Map();
        this.fileStreams = new Map();
        this.pendingTransfers = new Map();
        this.heartbeatInterval = null;
        this.chunkBuffers = new Map();
    }

    /* === INITIALIZATION === */

    async init(customPin = null) {
        if (this.peer) this.destroy();
        this.mode = 'online';
        this.peerId = customPin || this._generatePIN();

        return new Promise((resolve, reject) => {
            this.peer = new Peer(this.peerId, {
                debug: 1,
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
                console.warn('[PeerJS] Error:', err);
                if (err.type === 'unavailable-id') {
                    this.init(null).then(resolve).catch(reject);
                    return;
                }
                this.dispatchEvent(new CustomEvent('error', { detail: { message: 'Connection Error: ' + err.type } }));
            });
        });
    }

    async initManual(isHost) {
        if (this.peer) this.destroy();
        this.mode = 'manual';
        this.manualService = new ManualP2PService();

        this.manualService.addEventListener('signal-ready', (e) => this.dispatchEvent(new CustomEvent('signal-generated', { detail: e.detail })));
        this.manualService.addEventListener('connected', () => {
             this._startHeartbeat();
             this.dispatchEvent(new CustomEvent('connected', { detail: { peer: 'Manual Peer' } }));
        });
        this.manualService.addEventListener('data', (e) => this._handleData(e.detail));

        await this.manualService.init(isHost);
    }

    /* === PUBLIC API === */

    async processManualSignal(signalStr) {
        if (this.manualService) await this.manualService.handleSignal(signalStr);
    }

    connect(remotePin) {
        if (this.mode === 'online' && this.peer) {
            const conn = this.peer.connect(remotePin, {
                reliable: true,
                serialization: 'binary'
            });
            this._handleConnection(conn);
        }
    }

    sendChat(text) {
        if (!text || text.trim() === '') return;
        const chatData = {
            type: 'chat',
            text: text.trim(),
            timestamp: Date.now()
        };
        this._send(chatData);
        this.dispatchEvent(new CustomEvent('chat', { detail: { ...chatData, isOutgoing: true } }));
    }

    async sendFile(file) {
        try {
            errorHandler.validateFile(file, ALLOWED_MIME_TYPES);
        } catch (error) {
            this.dispatchEvent(new CustomEvent('error', { 
                detail: { message: error.message } 
            }));
            return;
        }
        
        const getBufferedAmount = () => {
            if (this.mode === 'online' && this.conn && this.conn.dataChannel) {
                return this.conn.dataChannel.bufferedAmount;
            }
            if (this.mode === 'manual' && this.manualService && this.manualService.dataChannel) {
                return this.manualService.dataChannel.bufferedAmount;
            }
            return 0;
        };

        if ((this.mode === 'online' && !this.conn) || (this.mode === 'manual' && !this.manualService)) {
             this.dispatchEvent(new CustomEvent('error', { detail: { message: 'No active connection' } }));
             return;
        }

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const transferId = this._generateTransferId(file);
        
        // Calculate file hash for integrity checking
        let fileHash = null;
        try {
            fileHash = await integrity.calculateFileHash(file);
        } catch (error) {
            console.warn('[P2P] Failed to calculate file hash:', error);
        }
        
        const meta = { 
            type: 'meta', 
            name: file.name, 
            size: file.size, 
            mime: file.type, 
            totalChunks, 
            transferId,
            hash: fileHash
        };

        this.dispatchEvent(new CustomEvent('transfer-start', { detail: { ...meta, isOutgoing: true } }));
        this._send(meta);

        let resumeIndex = 0;

        try {
            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.pendingTransfers.delete(transferId);
                    reject(new Error('Transfer timed out waiting for peer acceptance'));
                }, 60000);

                this.pendingTransfers.set(transferId, {
                    resolve: (data) => {
                        clearTimeout(timeout);
                        resolve(data);
                    },
                    reject: (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    }
                });
            });
            if (response && response.resumeIndex) {
                resumeIndex = response.resumeIndex;
            }
        } catch (error) {
            this.dispatchEvent(new CustomEvent('error', { detail: { message: error.message } }));
            return;
        }

        for (let i = resumeIndex; i < totalChunks; i++) {
            if (getBufferedAmount() > BUFFER_THRESHOLD) {
                await new Promise(resolve => {
                    const channel = this.mode === 'online' ? this.conn.dataChannel : this.manualService.dataChannel;
                    if (channel) {
                        const handler = () => {
                            channel.removeEventListener('bufferedamountlow', handler);
                            resolve();
                        };
                        channel.addEventListener('bufferedamountlow', handler);
                    } else {
                        setTimeout(resolve, 50);
                    }
                });
            }

            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            let chunkData;
            if (this.mode === 'manual') {
                 chunkData = await this._blobToBase64(chunk);
            } else {
                 chunkData = await chunk.arrayBuffer();
            }

            this._send({ type: 'chunk', index: i, total: totalChunks, data: chunkData, name: file.name, transferId });

            const progress = ((i + 1) / totalChunks) * 100;
            this.dispatchEvent(new CustomEvent('send-progress', { detail: { name: file.name, progress, transferId } }));
            if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
        }

        this.dispatchEvent(new CustomEvent('send-complete', { detail: { name: file.name, transferId } }));
    }

    async destroy() {
        this._stopHeartbeat();

        for (const [id, stream] of this.fileStreams) {
            try {
                await stream.writable.abort();
            } catch (e) {}
        }
        this.fileStreams.clear();
        this.receivingChunks.clear();
        this.chunkBuffers.clear();

        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        if (this.manualService) {
            if(this.manualService.peerConnection) this.manualService.peerConnection.close();
            this.manualService = null;
        }
        this.peer = null;
        this.conn = null;
    }

    /* === PRIVATE HANDLERS === */

    _send(data) {
        if (this.mode === 'online' && this.conn) this.conn.send(data);
        else if (this.mode === 'manual' && this.manualService) this.manualService.send(data);
    }

    _handleConnection(conn) {
        this.conn = conn;
        conn.on('open', () => {
            this._startHeartbeat();
            this.dispatchEvent(new CustomEvent('connected', { detail: { peer: conn.peer } }));
        });
        conn.on('data', (data) => this._handleData(data));
        conn.on('close', () => {
            this._stopHeartbeat();
            this.dispatchEvent(new Event('disconnected'));
            this.conn = null;
        });
        conn.on('error', (err) => this.dispatchEvent(new CustomEvent('error', { detail: err })));
    }

    _handleData(data) {
        if (!data) return;
        if (data.type === 'ping') return;

        if (data.type === 'chat') {
            this.dispatchEvent(new CustomEvent('chat', { detail: { ...data, isOutgoing: false } }));
            return;
        }

        if (data.type === 'transfer-accepted' || data.type === 'transfer-rejected') {
            this._handleTransferSignal(data);
            return;
        }

        if (data.type === 'chunk' && typeof data.data === 'string' && data.data.startsWith('data:')) {
             fetch(data.data).then(res => res.arrayBuffer()).then(buffer => {
                 data.data = buffer;
                 this._processChunk(data);
             });
             return;
        }
        this._processChunk(data);
    }

    _handleTransferSignal(data) {
        const pending = this.pendingTransfers.get(data.transferId);
        if (pending) {
            if (data.type === 'transfer-accepted') {
                pending.resolve(data);
            } else {
                pending.reject(new Error('Transfer rejected by peer'));
            }
            this.pendingTransfers.delete(data.transferId);
        }
    }

    async _processChunk(data) {
        if (data.type === 'meta') {
            await this._handleMetaPacket(data);
        } else if (data.type === 'chunk') {
            await this._handleChunkPacket(data);
        }
    }

    async _handleMetaPacket(data) {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const { usage, quota } = await navigator.storage.estimate();
            if (usage + data.size > quota) {
                this.dispatchEvent(new CustomEvent('error', { detail: { message: 'Storage quota exceeded!' } }));
                this._send({ type: 'transfer-rejected', transferId: data.transferId, reason: 'Quota exceeded' });
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
                this._send({ type: 'transfer-accepted', transferId: data.transferId });
                this.dispatchEvent(new CustomEvent('transfer-start', { detail: data }));
                return;
            }
        } catch (err) {
            console.warn('[P2P] File Picker cancelled or failed, falling back to IDB.', err);
        }

        const existingCount = await db.countChunks(data.transferId);

        this.receivingChunks.set(data.transferId, {
            received: existingCount,
            total: data.totalChunks,
            size: data.size,
            mime: data.mime,
            name: data.name
        });

        if (existingCount === 0) {
            db.deleteFileChunks(data.transferId).catch(e => console.warn(e));
        }

        this._send({
            type: 'transfer-accepted',
            transferId: data.transferId,
            resumeIndex: existingCount
        });
        this.dispatchEvent(new CustomEvent('transfer-start', { detail: data }));
    }

    async _handleChunkPacket(data) {
        if (this.fileStreams.has(data.transferId)) {
            const stream = this.fileStreams.get(data.transferId);
            await stream.writable.write(data.data);
            stream.received++;

            const progress = (stream.received / stream.total) * 100;
            this.dispatchEvent(new CustomEvent('receive-progress', { detail: { name: stream.name, progress, transferId: data.transferId } }));

            if (stream.received === stream.total) {
                await stream.writable.close();
                this.fileStreams.delete(data.transferId);
                this.dispatchEvent(new CustomEvent('file-saved', { detail: { name: stream.name, transferId: data.transferId } }));
            }
            return;
        }

        const fileData = this.receivingChunks.get(data.transferId);
        if (!fileData) return;

        if (!this.chunkBuffers.has(data.transferId)) {
            this.chunkBuffers.set(data.transferId, []);
        }
        const buffer = this.chunkBuffers.get(data.transferId);
        buffer.push({ index: data.index, data: data.data });

        fileData.received++;
        const isLastChunk = fileData.received === fileData.total;

        if (buffer.length >= 50 || isLastChunk) {
            await this._flushChunkBuffer(data.transferId);
        }

        const progress = (fileData.received / fileData.total) * 100;
        this.dispatchEvent(new CustomEvent('receive-progress', { detail: { name: fileData.name, progress, transferId: data.transferId } }));

        if (isLastChunk) {
            await this._finalizeIDBTransfer(data.transferId, fileData);
        }
    }

    async _finalizeIDBTransfer(transferId, fileData) {
        try {
            const isLargeFile = fileData.total > 100; // >6.4MB with 64KB chunks
            
            if (isLargeFile) {
                await this._finalizeStreamingIDBTransfer(transferId, fileData);
            } else {
                const chunks = await db.getFileChunks(transferId);
                const blob = new Blob(chunks, { type: fileData.mime });
                const safeBlob = this._sanitizeBlob(blob, fileData.mime);

                if (safeBlob) {
                    // Verify integrity if hash was provided
                    const transfer = this.receivingChunks.get(transferId);
                    let verified = false;
                    if (transfer && transfer.meta && transfer.meta.hash) {
                        try {
                            verified = await integrity.verifyReceivedFile(safeBlob, transfer.meta);
                            if (!verified) {
                                this.dispatchEvent(new CustomEvent('error', { 
                                    detail: { message: 'File integrity verification failed. File may be corrupted.' } 
                                }));
                                return;
                            }
                        } catch (error) {
                            console.warn('[P2P] Integrity verification failed:', error);
                        }
                    }
                    
                    this.dispatchEvent(new CustomEvent('file-received', {
                        detail: { 
                            blob: safeBlob, 
                            name: fileData.name, 
                            mime: fileData.mime, 
                            transferId,
                            verified: verified
                        }
                    }));
                }
            }
        } catch (error) {
             console.error('[P2P] Finalize failed:', error);
             this.dispatchEvent(new CustomEvent('error', { detail: { message: 'Failed to assemble file' } }));
        } finally {
            await db.deleteFileChunks(transferId);
            this.receivingChunks.delete(transferId);
            this.chunkBuffers.delete(transferId);
        }
    }

    async _finalizeStreamingIDBTransfer(transferId, fileData) {
        try {
            const stream = new ReadableStream({
                async start(controller) {
                    const chunkIterator = await db.getFileChunkStream(transferId, 5);
                    
                    for await (const batch of chunkIterator) {
                        for (const chunk of batch) {
                            controller.enqueue(new Uint8Array(chunk));
                        }
                    }
                    controller.close();
                }
            });

            const response = new Response(stream, {
                headers: { 'Content-Type': fileData.mime }
            });
            const blob = await response.blob();
            const safeBlob = this._sanitizeBlob(blob, fileData.mime);

            if (safeBlob) {
                // Verify integrity if hash was provided
                const transfer = this.receivingChunks.get(transferId);
                let verified = false;
                if (transfer && transfer.meta && transfer.meta.hash) {
                    try {
                        verified = await integrity.verifyReceivedFile(safeBlob, transfer.meta);
                        if (!verified) {
                            this.dispatchEvent(new CustomEvent('error', { 
                                detail: { message: 'File integrity verification failed. File may be corrupted.' } 
                            }));
                            return;
                        }
                    } catch (error) {
                        console.warn('[P2P] Integrity verification failed:', error);
                    }
                }
                
                this.dispatchEvent(new CustomEvent('file-received', {
                    detail: { 
                        blob: safeBlob, 
                        name: fileData.name, 
                        mime: fileData.mime, 
                        transferId,
                        verified: verified
                    }
                }));
            }
        } catch (error) {
            console.error('[P2P] Stream assembly failed:', error);
            throw error;
        }
    }

    async _flushChunkBuffer(transferId) {
        const buffer = this.chunkBuffers.get(transferId);
        if (!buffer || buffer.length === 0) return;

        const chunksToWrite = [...buffer];
        buffer.length = 0;

        for (const item of chunksToWrite) {
            await db.addChunk(transferId, item.index, item.data);
        }
    }

    /* === UTILITIES === */

    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    _sanitizeBlob(blob, mimeType) {
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            console.warn('[P2P] Rejected file with disallowed MIME type:', mimeType);
            return null;
        }
        
        if (blob.size > 500 * 1024 * 1024) { // 500MB limit
            console.warn('[P2P] Rejected file exceeding size limit:', blob.size);
            return null;
        }
        
        if (blob.size === 0) {
            console.warn('[P2P] Rejected empty file');
            return null;
        }
        
        return blob;
    }

    _generatePIN() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    _generateTransferId(file) {
        return `${file.name}-${file.size}-${file.lastModified}`;
    }

    _startHeartbeat() {
        this._stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            const ping = { type: 'ping' };
            if (this.mode === 'online' && this.conn) this.conn.send(ping);
            else if (this.mode === 'manual' && this.manualService) this.manualService.send(ping);
        }, HEARTBEAT_INTERVAL);
    }

    _stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
}

export const p2p = new P2PService();
