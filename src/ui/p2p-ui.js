import { p2p } from '../p2p.js';
import { common } from './common.js';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const p2pUI = {
    elements: {
        pinDisplay: document.getElementById('my-pin-display'),
        tabs: document.querySelectorAll('.p2p-tab-btn'),
        tabContents: document.querySelectorAll('.p2p-tab-content'),
        manualSwitch: document.getElementById('manual-mode-switch'),
        manualArea: document.getElementById('manual-signal-area'),
        connectionForm: document.querySelector('.connection-form'),
        qrDisplay: document.getElementById('qr-display'),
        btnScan: document.getElementById('btn-scan-qr'),
        fileInput: document.getElementById('file-upload'),
        dropZone: document.getElementById('drop-zone'),
        btnConnect: document.getElementById('btn-connect'),
    },
    html5QrcodeScanner: null,

    init() {
        this._bindTabs();
        this._bindP2PEvents();
        this._bindManualMode();
        this._bindFileHandling();
        this._bindConnection();

        if (p2p.peerId && this.elements.pinDisplay) {
            this.elements.pinDisplay.textContent = p2p.peerId;
            common.updateStatus('Online', 'success');
        }
    },

    _bindTabs() {
        if (!this.elements.tabs) return;
        this.elements.tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.tabs.forEach(b => b.classList.remove('active'));
                this.elements.tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const targetId = `tab-${btn.dataset.tab}`;
                const targetContent = document.getElementById(targetId);
                if (targetContent) targetContent.classList.add('active');
            });
        });
    },

    _bindManualMode() {
        if (this.elements.manualSwitch) {
            this.elements.manualSwitch.addEventListener('change', async (e) => {
                const isManual = e.target.checked;
                if (isManual) {
                    this.elements.manualArea.classList.remove('hidden');
                    if(this.elements.connectionForm) this.elements.connectionForm.classList.add('hidden');
                    const isHost = document.querySelector('.p2p-tab-btn[data-tab="send"]').classList.contains('active');
                    await p2p.initManual(isHost);
                    common.updateStatus('Manual (Offline)', 'warning');
                } else {
                    this.elements.manualArea.classList.add('hidden');
                    if(this.elements.connectionForm) this.elements.connectionForm.classList.remove('hidden');
                    await p2p.init();
                }
            });
        }

        if (this.elements.btnScan) {
            this.elements.btnScan.addEventListener('click', () => {
                const readerElem = document.getElementById('qr-reader');
                readerElem.style.display = 'block';
                
                if (this.html5QrcodeScanner) this.html5QrcodeScanner.clear();

                this.html5QrcodeScanner = new Html5QrcodeScanner(
                    "qr-reader", { fps: 10, qrbox: 250 });
                
                this.html5QrcodeScanner.render((decodedText) => {
                    p2p.processManualSignal(decodedText);
                    this.html5QrcodeScanner.clear();
                    readerElem.style.display = 'none';
                    common.showToast('Signal Scanned!', 'success');
                }, (error) => {});
            });
        }
    },

    _bindConnection() {
        if (this.elements.btnConnect) {
            this.elements.btnConnect.addEventListener('click', () => {
                const pin = document.getElementById('remote-pin').value;
                if (pin.length === 4) p2p.connect(pin);
            });
        }
    },

    _bindFileHandling() {
        const { dropZone, fileInput } = this.elements;
        if (!dropZone || !fileInput) return;

        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) {
                this._handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this._handleFileUpload(e.target.files[0]);
            }
        });
    },

    _handleFileUpload(file) {
        if (file) {
            p2p.sendFile(file);
            common.showToast(`Sending ${file.name}...`, 'info');
        }
    },

    _bindP2PEvents() {
        p2p.addEventListener('ready', (e) => {
            if (this.elements.pinDisplay) this.elements.pinDisplay.textContent = e.detail.id;
            common.updateStatus('Online', 'success');
        });

        p2p.addEventListener('connected', (e) => {
            common.updateStatus(`Connected`, 'success');
            common.showToast('Peer connected!', 'success');
        });

        p2p.addEventListener('signal-generated', (e) => {
            QRCode.toCanvas(e.detail, { errorCorrectionLevel: 'L' }, (err, canvas) => {
                if (err) { console.error(err); return; }
                this.elements.qrDisplay.innerHTML = '';
                this.elements.qrDisplay.appendChild(canvas);
                const p = document.createElement('p');
                p.textContent = 'Scan this on the other device';
                this.elements.qrDisplay.appendChild(p);
            });
        });

        p2p.addEventListener('file-received', (e) => {
            const { blob, name, mime } = e.detail;
            const url = URL.createObjectURL(blob);
            const downloadBtn = document.createElement('a');
            downloadBtn.href = url;
            downloadBtn.download = name;
            downloadBtn.className = 'btn primary small';
            downloadBtn.textContent = 'Save to Device';
            downloadBtn.style.marginTop = '0.5rem';
            
            downloadBtn.addEventListener('click', () => setTimeout(() => URL.revokeObjectURL(url), 100));
            setTimeout(() => URL.revokeObjectURL(url), 12000);
            this._showFileNotification(name, downloadBtn);
        });

        p2p.addEventListener('send-progress', (e) => this._updateTransferProgress('Sending', e.detail.name, e.detail.progress));
        p2p.addEventListener('receive-progress', (e) => this._updateTransferProgress('Receiving', e.detail.name, e.detail.progress));
        p2p.addEventListener('send-complete', (e) => {
            this._updateTransferProgress('Sent', e.detail.name, 100);
            setTimeout(() => this._clearTransferProgress(), 3000);
        });
        p2p.addEventListener('transfer-start', (e) => this._updateTransferProgress('Starting', e.detail.name, 0));
    },

    _updateTransferProgress(status, filename, progress) {
        const transferStatus = document.getElementById('transfer-status');
        if (!transferStatus) return;

        let progressBar = transferStatus.querySelector('.progress-bar');
        
        if (!progressBar) {
            transferStatus.innerHTML = `
                <div class="transfer-info">
                    <strong><span id="transfer-status-text"></span>:</strong> <span id="transfer-filename"></span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: 0%"></div>
                    <span class="progress-text">0%</span>
                </div>`;
            progressBar = transferStatus.querySelector('.progress-bar');
        }

        const statusText = transferStatus.querySelector('#transfer-status-text');
        const fileText = transferStatus.querySelector('#transfer-filename');
        const progressText = transferStatus.querySelector('.progress-text');

        if (statusText) statusText.textContent = status;
        if (fileText) fileText.textContent = common.sanitizeText(filename);
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;
    },

    _clearTransferProgress() {
        const transferStatus = document.getElementById('transfer-status');
        if (transferStatus) transferStatus.innerHTML = '<div class="empty-log"><i class="ph ph-broadcast"></i><p>Waiting for connection...</p></div>';
    },

    _showFileNotification(filename, actionBtn) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.style.flexDirection = 'column';
        toast.style.alignItems = 'flex-start';
        const text = document.createElement('div');
        text.innerHTML = `Received <b>${common.sanitizeText(filename)}</b>`;
        toast.appendChild(text);
        toast.appendChild(actionBtn);
        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => toast.remove(), 10000);
        }
    }
};