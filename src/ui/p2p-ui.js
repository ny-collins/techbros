import { p2p } from '../p2p.js';
import { common } from './common.js';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const p2pUI = {
    elements: {
        handshakeView: document.getElementById('p2p-handshake-view'),
        dashboardView: document.getElementById('p2p-dashboard-view'),

        roleSelection: document.querySelector('.p2p-role-selection'),
        hostPanel: document.getElementById('host-panel'),
        joinPanel: document.getElementById('join-panel'),

        btnHost: document.getElementById('btn-role-host'),
        btnJoin: document.getElementById('btn-role-join'),
        btnBackRole: document.querySelectorAll('.btn-back-role'),
        btnConnect: document.getElementById('btn-connect'),
        btnDisconnect: document.getElementById('btn-disconnect'),
        btnScan: document.getElementById('btn-scan-qr'),

        pinDisplay: document.getElementById('my-pin-display'),
        hostQrDisplay: document.getElementById('host-qr-display'),
        statusText: document.getElementById('dashboard-status-text'),
        remotePinInput: document.getElementById('remote-pin'),
        manualSwitchHost: document.getElementById('manual-mode-switch-host'),

        transferFeed: document.getElementById('transfer-feed'),
        fileInput: document.getElementById('file-upload'),
        btnAttach: document.getElementById('btn-attach'),
        chatInput: document.getElementById('chat-msg-input'),
        btnSendChat: document.getElementById('btn-send-chat'),
    },

    scanner: null,
    currentRole: null,

    /* === INITIALIZATION === */

    init() {
        this._bindRoleSelection();
        this._bindConnectionLogic();
        this._bindDashboard();
        this._bindChat();
        this._bindP2PEvents();
    },

    /* === ROLE SELECTION === */

    _bindRoleSelection() {
        if (this.elements.btnHost) {
            this.elements.btnHost.addEventListener('click', async () => {
                this.currentRole = 'host';
                this._showPanel('host');
                await p2p.init();
            });
        }

        if (this.elements.btnJoin) {
            this.elements.btnJoin.addEventListener('click', async () => {
                this.currentRole = 'guest';
                this._showPanel('join');
                await p2p.init();
            });
        }

        this.elements.btnBackRole.forEach(btn => {
            btn.addEventListener('click', () => {
                this._resetHandshake();
                p2p.destroy();
            });
        });
    },

    _showPanel(type) {
        this.elements.roleSelection.style.display = 'none';
        if (type === 'host') {
            this.elements.hostPanel.classList.remove('hidden');
            this.elements.joinPanel.classList.add('hidden');
        } else {
            this.elements.joinPanel.classList.remove('hidden');
            this.elements.hostPanel.classList.add('hidden');
        }
    },

    _resetHandshake() {
        if (this.scanner) {
            this.scanner.clear().catch(error => console.warn("Failed to clear scanner", error));
            this.scanner = null;
        }

        this.elements.roleSelection.style.display = 'grid';
        this.elements.hostPanel.classList.add('hidden');
        this.elements.joinPanel.classList.add('hidden');
        this.elements.handshakeView.classList.remove('hidden');
        this.elements.dashboardView.classList.add('hidden');

        if (this.elements.hostQrDisplay) this.elements.hostQrDisplay.classList.add('hidden');
        if (this.elements.manualSwitchHost) this.elements.manualSwitchHost.checked = false;
        if (this.elements.remotePinInput) this.elements.remotePinInput.value = '';

        this.elements.transferFeed.innerHTML = '<div class="system-message">Connection established. You can now share files.</div>';
    },

    /* === CONNECTION LOGIC === */

    _bindConnectionLogic() {
        if (this.elements.manualSwitchHost) {
            this.elements.manualSwitchHost.addEventListener('change', async (e) => {
                const isManual = e.target.checked;
                if (isManual) {
                    this.elements.hostQrDisplay.classList.remove('hidden');
                    await p2p.initManual(true);
                } else {
                    this.elements.hostQrDisplay.classList.add('hidden');
                    await p2p.init();
                }
            });
        }

        if (this.elements.btnConnect) {
            this.elements.btnConnect.addEventListener('click', () => {
                const pin = this.elements.remotePinInput.value;
                if (pin.length === 4) {
                    this.elements.btnConnect.textContent = 'Connecting...';
                    p2p.connect(pin);
                } else {
                    common.showToast('Please enter a 4-digit PIN', 'warning');
                }
            });
        }

        if (this.elements.btnScan) {
            this.elements.btnScan.addEventListener('click', () => {
                const readerElem = document.getElementById('qr-reader');
                readerElem.classList.remove('hidden');

                if (this.scanner) this.scanner.clear();
                this.scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });

                this.scanner.render((decodedText) => {
                    p2p.processManualSignal(decodedText);
                    this.scanner.clear();
                    readerElem.classList.add('hidden');
                    common.showToast('Signal Scanned! Connecting...', 'success');
                }, console.warn);
            });
        }
    },

    /* === DASHBOARD === */

    _bindDashboard() {
        if (this.elements.btnDisconnect) {
            this.elements.btnDisconnect.addEventListener('click', () => {
                p2p.destroy();
                this._resetHandshake();
                common.showToast('Disconnected', 'info');
            });
        }

        if (this.elements.btnAttach) {
            this.elements.btnAttach.addEventListener('click', () => this.elements.fileInput.click());
        }

        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) this._handleFileUpload(e.target.files[0]);
            });
        }
    },

    _bindChat() {
        const { chatInput, btnSendChat } = this.elements;
        if (!chatInput || !btnSendChat) return;

        const sendMsg = () => {
            const text = chatInput.value.trim();
            if (text) {
                p2p.sendChat(text);
                chatInput.value = '';
            }
        };

        btnSendChat.addEventListener('click', sendMsg);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMsg();
        });
    },

    _handleFileUpload(file) {

        if (!file) return;
        p2p.sendFile(file);
    },

    /* === EVENT LISTENERS === */

    _bindP2PEvents() {
        p2p.addEventListener('ready', (e) => {
            if (this.elements.pinDisplay) this.elements.pinDisplay.textContent = e.detail.id;
        });

        p2p.addEventListener('connected', (e) => {
            this.elements.handshakeView.classList.add('hidden');
            this.elements.dashboardView.classList.remove('hidden');

            if(this.elements.btnConnect) this.elements.btnConnect.textContent = 'Connect';

            const peerId = e.detail.peer || 'Unknown';
            if (this.elements.statusText) this.elements.statusText.textContent = `Connected to ${peerId}`;
            common.showToast('Connected!', 'success');
        });

        p2p.addEventListener('signal-generated', (e) => {
            QRCode.toCanvas(e.detail, { errorCorrectionLevel: 'L' }, (err, canvas) => {
                if (!err && this.elements.hostQrDisplay) {
                    this.elements.hostQrDisplay.innerHTML = '';
                    this.elements.hostQrDisplay.appendChild(canvas);
                }
            });
        });

        p2p.addEventListener('error', (e) => {
            common.showToast(e.detail.message || 'Connection Error', 'error');
            if(this.elements.btnConnect) this.elements.btnConnect.textContent = 'Connect';
        });

        p2p.addEventListener('chat', (e) => this._renderChatBubble(e.detail));

        p2p.addEventListener('transfer-start', (e) => this._addBubble(e.detail));
        p2p.addEventListener('send-progress', (e) => this._updateBubble(e.detail, 'sending'));
        p2p.addEventListener('receive-progress', (e) => this._updateBubble(e.detail, 'receiving'));
        p2p.addEventListener('file-received', (e) => this._completeBubble(e.detail, 'received'));
        p2p.addEventListener('send-complete', (e) => this._completeBubble(e.detail, 'sent'));
    },

    /* === UI COMPONENTS === */

    _renderChatBubble(data) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${data.isOutgoing ? 'outgoing' : 'incoming'}`;

        const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        bubble.innerHTML = `
            <div class="bubble-text">${common.sanitizeText(data.text)}</div>
            <span class="bubble-meta">${time}</span>
        `;

        this.elements.transferFeed.appendChild(bubble);
        this.elements.transferFeed.scrollTop = this.elements.transferFeed.scrollHeight;
    },

    _addBubble(data) {
        this._getOrCreateBubble(data.transferId, data.name, data.isOutgoing);
    },

    _getOrCreateBubble(id, name, isOutgoing) {
        let bubble = document.getElementById(`transfer-${id}`);
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.id = `transfer-${id}`;
            bubble.className = `chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

            const icon = isOutgoing ? 'upload-simple' : 'download-simple';

            bubble.innerHTML = `
                <div class="bubble-content">
                    <div class="bubble-icon"><i class="ph ph-${icon}"></i></div>
                    <div class="bubble-info">
                        <h4>${common.sanitizeText(name)}</h4>
                        <span class="status pulse">Starting...</span>
                    </div>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="action-area" style="margin-top: 8px; display: none;"></div>
            `;
            this.elements.transferFeed.appendChild(bubble);
            this.elements.transferFeed.scrollTop = this.elements.transferFeed.scrollHeight;
        }
        return bubble;
    },

    _updateBubble(data, state) {
        const isOutgoing = state === 'sending';
        const bubble = this._getOrCreateBubble(data.transferId, data.name, isOutgoing);

        const fill = bubble.querySelector('.progress-fill');
        const status = bubble.querySelector('.status');

        if (status) {
            status.classList.remove('pulse');
            status.textContent = `${Math.round(data.progress)}%`;
        }
        if (fill) fill.style.width = `${data.progress}%`;
    },

    _completeBubble(data, state) {
        const isOutgoing = state === 'sent';
        const bubble = this._getOrCreateBubble(data.transferId, data.name, isOutgoing);

        const fill = bubble.querySelector('.progress-fill');
        const status = bubble.querySelector('.status');
        const actionArea = bubble.querySelector('.action-area');

        if (fill) fill.style.width = '100%';
        if (status) status.textContent = isOutgoing ? 'Sent' : 'Received';

        if (state === 'received' && data.blob) {
            const url = URL.createObjectURL(data.blob);
            actionArea.style.display = 'block';
            actionArea.innerHTML = `
                <a href="${url}" download="${data.name}" class="btn primary small full-width">
                    Save File
                </a>
            `;
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
    }
};
