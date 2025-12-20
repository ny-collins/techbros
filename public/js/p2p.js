/**
 * TechBros P2P Engine (v2.0)
 * Wraps PeerJS to handle signaling, connection management,
 * and file transfers with event-based communication.
 */

export class P2PService extends EventTarget {
    constructor() {
        super();
        this.peer = null;
        this.conn = null;
        this.peerId = null; // This will be the 4-digit PIN
        this.isHost = false; // True if we are the Sender (Host)
    }

    /**
     * Initialize the PeerJS instance.
     * @param {string} [customPin] - Optional 4-digit PIN. If not provided, one is generated.
     * @returns {Promise<string>} - Resolves with the PIN (Peer ID)
     */
    async init(customPin = null) {
        // Disconnect existing if any
        if (this.peer) this.destroy();

        // Use custom PIN or generate one (assuming utils.generatePIN exists or we do it here)
        this.peerId = customPin || this._generatePIN();
        this.isHost = !!customPin; // If we set the PIN, we usually act as host, but logic varies

        console.log(`[P2P] Initializing with ID: ${this.peerId}`);

        return new Promise((resolve, reject) => {
            // NOTE: We assume 'Peer' is loaded globally via script tag in index.html
            // We use the default PeerJS cloud server for signaling.
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

            // --- Peer Events ---

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
                // Workaround: PeerJS doesn't auto-reconnect to signaling
                this.peer.reconnect();
            });

            this.peer.on('error', (err) => {
                console.error('[P2P] Peer Error:', err.type, err);
                
                // Handle ID collisions (if PIN is taken)
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

    /**
     * Connect to a remote peer (Receiver connecting to Sender).
     * @param {string} remotePin - The 4-digit PIN of the target
     */
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

    /**
     * Send a file to the connected peer.
     * @param {File} file - The file object
     */
    sendFile(file) {
        if (!this.conn || !this.conn.open) {
            this.dispatchEvent(new CustomEvent('error', { detail: { message: 'No active connection' } }));
            return;
        }

        console.log(`[P2P] Sending file: ${file.name} (${file.size} bytes)`);

        // Send metadata first (optional, but good practice)
        this.conn.send({
            type: 'meta',
            name: file.name,
            size: file.size,
            mime: file.type
        });

        // Send the actual file (PeerJS handles binary blob serialization)
        // NOTE: For very large files (>100MB), we might need chunking. 
        // For v2.0 baseline, we rely on browser Blob handling.
        this.conn.send({
            type: 'file',
            file: file, // The Blob
            name: file.name,
            mime: file.type
        });
    }

    /**
     * Cleanup and destroy peer connection.
     */
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

    // --- Private Helpers ---

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
        // 1. Handle Metadata (optional UI update)
        if (data.type === 'meta') {
            console.log(`[P2P] Incoming file metadata: ${data.name}`);
            this.dispatchEvent(new CustomEvent('transfer-start', { detail: data }));
            return;
        }

        // 2. Handle File Data
        if (data.file) {
            console.log('[P2P] File received');
            
            // Security: Basic Sanity Check
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
        // Block executables or dangerous scripts
        const blockedTypes = [
            'application/x-msdownload', 
            'application/x-exe', 
            'text/javascript', 
            'application/javascript'
        ];

        if (blockedTypes.includes(mimeType)) {
            return null;
        }

        // Return valid blob
        return blob;
    }

    _generatePIN() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }
}

// Export singleton instance
export const p2p = new P2PService();