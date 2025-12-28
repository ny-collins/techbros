import { store } from './store.js';
import { p2p } from './p2p.js';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';

class UI {
    constructor() {
        this.elements = {};
        this.currentView = 'library';
        this.activeFilter = 'all';
    }

    init() {
        this.elements = {
            app: document.getElementById('app'),
            splashScreen: document.getElementById('splash-screen'),
            sidebar: document.getElementById('main-sidebar'),
            brandToggle: document.getElementById('brand-toggle'),
            sidebarClose: document.getElementById('sidebar-close'),
            mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
            overlay: document.getElementById('sidebar-overlay'),
            topBar: document.getElementById('main-header'),

            navLinks: document.querySelectorAll('.nav-link'),
            views: document.querySelectorAll('.view-section'),
            
            libraryList: document.getElementById('resource-list'),
            filterContainer: document.getElementById('filter-container'),
            searchInput: document.getElementById('search-input'),
            
            p2pPinDisplay: document.getElementById('my-pin-display'),
            p2pStatus: document.getElementById('p2p-status'),
            p2pTabs: document.querySelectorAll('.p2p-tab-btn'),
            p2pTabContents: document.querySelectorAll('.p2p-tab-content'),
            
            fileInput: document.getElementById('file-upload'),
            dropZone: document.getElementById('drop-zone'),

            btnClearCache: document.getElementById('btn-clear-cache'),
            btnGrid: document.getElementById('view-grid'),
            btnList: document.getElementById('view-list'),
            btnConnect: document.getElementById('btn-connect'),
            
            playerContainer: document.getElementById('player-container'),
            backButton: document.getElementById('btn-back-library'),
            notificationArea: document.getElementById('notification-area'),
            
            confirmOverlay: document.getElementById('confirmation-overlay'),
            confirmMessage: document.getElementById('confirmation-message'),
            confirmBtn: document.getElementById('btn-confirm-ok'),
            cancelBtn: document.getElementById('btn-confirm-cancel')
        };

        this._bindNavigation();
        this._bindSearch();
        this._bindP2PTabs();
        this._bindP2P();
        this._bindGlobalEvents();
        this._bindDropZone();
        
        const resources = store.getResources();
        this.renderFilters(resources);
        this.renderLibrary(resources);
        
        this.updateTheme(store.getSettings().theme);

        window.addEventListener('popstate', (event) => {
            const state = event.state;
            if (state && state.view) {
                this.navigateTo(state.view, false);
            } else {
                const hash = window.location.hash.substring(1);
                this.navigateTo(hash || 'library', false);
            }
        });

        const initialHash = window.location.hash.substring(1);
        if (initialHash) {
            this.navigateTo(initialHash, false);
        } else {
            history.replaceState({ view: 'library' }, '', '#library');
        }

        const version = store.getVersion();
        const sidebarVer = document.getElementById('app-version-sidebar');
        if (sidebarVer) sidebarVer.textContent = `v${version}`;

        if (this.elements.splashScreen) {
            setTimeout(() => {
                this.elements.splashScreen.classList.add('hidden');
            }, 800);
        }

        if (navigator.onLine) {
            this.updateStatus('Online', 'success');
        } else {
            this.updateStatus('Offline', 'neutral');
        }

        console.log('[UI] Initialized');
    }

    renderFilters(resources) {
        if (!this.elements.filterContainer) return;
        
        const types = new Set(['all']);
        resources.forEach(r => types.add(r.type));
        
        this.elements.filterContainer.innerHTML = '';
        
        types.forEach(type => {
            const btn = document.createElement('button');
            btn.className = `chip ${this.activeFilter === type ? 'active' : ''}`;
            btn.textContent = type.charAt(0).toUpperCase() + type.slice(1) + (type === 'all' ? '' : 's');
            btn.dataset.filter = type;
            
            btn.addEventListener('click', () => {
                this.activeFilter = type;
                this.elements.filterContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                
                if (type === 'all') {
                    this.renderLibrary(store.getResources());
                } else {
                    const filtered = store.getResources().filter(r => r.type === type);
                    this.renderLibrary(filtered);
                }
            });
            
            this.elements.filterContainer.appendChild(btn);
        });
    }

    toggleSidebar() {
        if (!this.elements.sidebar) return;
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.elements.sidebar.classList.remove('collapsed');
            this.elements.sidebar.classList.toggle('open');
            if (this.elements.overlay) this.elements.overlay.classList.toggle('active');
        } else {
            this.elements.sidebar.classList.toggle('collapsed');
        }
    }

    closeSidebar() {
        if (!this.elements.sidebar) return;
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.elements.sidebar.classList.remove('collapsed');
            this.elements.sidebar.classList.remove('open');
            if (this.elements.overlay) this.elements.overlay.classList.remove('active');
        } else {
            this.elements.sidebar.classList.add('collapsed');
        }
    }

    renderLibrary(resources) {
        if (!this.elements.libraryList) return;

        this.elements.libraryList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        if (resources.length === 0) {
            this.elements.libraryList.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align:center; padding: 4rem; color: var(--glass-border);">
                    <i class="ph ph-ghost" style="font-size: 64px; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p style="color: var(--text-muted);">No resources found.</p>
                </div>`;
            return;
        }

        resources.forEach(resource => {
            const card = this._createResourceCard(resource);
            fragment.appendChild(card);
        });
        this.elements.libraryList.appendChild(fragment);
    }

    _createResourceCard(data) {
        const div = document.createElement('div');
        div.className = 'resource-card';
        div.setAttribute('tabindex', '0');
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', `Open ${this._sanitizeText(data.title)}`);

        div.addEventListener('click', () => this.openResource(data));
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openResource(data);
            }
        });

        if (data.added) {
            const addedDate = new Date(data.added);
            const now = new Date();
            const diffHours = (now - addedDate) / (1000 * 60 * 60);
            if (diffHours < 24) {
                const badge = document.createElement('span');
                badge.className = 'badge-new';
                badge.textContent = 'NEW';
                div.appendChild(badge);
            }
        }

        const iconDiv = document.createElement('div');
        iconDiv.className = 'card-icon';
        iconDiv.innerHTML = this._getIconForType(data.type);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'card-content';

        const title = document.createElement('h3');
        title.textContent = this._sanitizeText(data.title);

        const meta = document.createElement('div');
        meta.className = 'meta';
        
        const typeSpan = document.createElement('span');
        typeSpan.textContent = data.type.toUpperCase();
        
        const sizeSpan = document.createElement('span');
        sizeSpan.textContent = this._formatBytes(data.size || 0);

        meta.appendChild(typeSpan);
        meta.appendChild(sizeSpan);

        contentDiv.appendChild(title);
        contentDiv.appendChild(meta);

        div.appendChild(iconDiv);
        div.appendChild(contentDiv);

        return div;
    }

    openResource(resource) {
        if (this.elements.topBar) this.elements.topBar.classList.add('hidden');
        this.closeSidebar();

        const container = this.elements.playerContainer;
        if (container) container.innerHTML = '';

        if (resource.type === 'audio') {
            const card = document.createElement('div');
            card.className = 'audio-player-card';

            const coverContainer = document.createElement('div');
            
            if (resource.cover) {
                const img = document.createElement('img');
                img.src = resource.cover;
                img.className = 'player-cover-art';
                img.alt = 'Cover';
                
                img.addEventListener('error', () => {
                    coverContainer.innerHTML = '';
                    coverContainer.appendChild(this._createAudioFallback());
                });
                coverContainer.appendChild(img);
            } else {
                coverContainer.appendChild(this._createAudioFallback());
            }

            const metaDiv = document.createElement('div');
            metaDiv.className = 'player-meta';
            const title = document.createElement('h2');
            title.textContent = this._sanitizeText(resource.title);
            metaDiv.appendChild(title);

            const audio = document.createElement('audio');
            audio.controls = true;
            audio.autoplay = true;
            audio.src = resource.url;

            card.appendChild(coverContainer);
            card.appendChild(metaDiv);
            card.appendChild(audio);

            if(container) container.appendChild(card);
        } else if (resource.type === 'video') {
            const video = document.createElement('video');
            video.className = 'full-viewer';
            video.controls = true; video.autoplay = true; video.src = resource.url;
            video.onerror = () => this.showToast('Error loading video', 'error');
            if(container) container.appendChild(video);
        } else if (resource.type === 'pdf') {
            const pdfContainer = document.createElement('div');
            pdfContainer.className = 'full-viewer pdf-viewer-root';
            if(container) {
                container.appendChild(pdfContainer);
                const viewer = new PDFViewer(pdfContainer, resource.url);
                viewer.init();
            }
        } else {
             const img = document.createElement('img');
             img.src = resource.url;
             img.style.maxWidth = '100%'; img.style.maxHeight = '90vh';
             img.onerror = () => {
                 img.style.display = 'none';
                 this.showToast('Error loading image', 'error');
             };
             if(container) container.appendChild(img);
        }
        this.navigateTo('resource');
    }

    _createAudioFallback() {
        const div = document.createElement('div');
        div.className = 'audio-fallback';
        div.innerHTML = '<i class="ph ph-music-note"></i>';
        return div;
    }

    _sanitizeText(str) {
        if (!str) return '';
        return str.replace(/[<>]/g, '');
    }

    _bindNavigation() {
        if (this.elements.navLinks) {
            this.elements.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const linkEl = e.currentTarget;
                    const target = linkEl.getAttribute('href').substring(1);

                    if (target === 'library') {
                        if (this.elements.searchInput) {
                            this.elements.searchInput.value = '';
                        }
                        this.renderLibrary(store.getResources());

                        if (this.elements.filterContainer) {
                            this.activeFilter = 'all';
                            this.elements.filterContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                            const allBtn = this.elements.filterContainer.querySelector('[data-filter="all"]');
                            if (allBtn) allBtn.classList.add('active');
                        }
                    }

                    if (this.currentView === 'resource' && this.elements.playerContainer) {
                        this.elements.playerContainer.innerHTML = '';
                    }
                    this.navigateTo(target);

                    if (window.innerWidth <= 768) this.closeSidebar();
                });
            });
        }

        if (this.elements.backButton) {
            this.elements.backButton.addEventListener('click', () => {
                if(this.elements.playerContainer) this.elements.playerContainer.innerHTML = '';
                this.navigateTo('library');
            });
        }
    }

    _bindDropZone() {
        const dropZone = this.elements.dropZone;
        const fileInput = this.elements.fileInput;
        
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
                const file = e.dataTransfer.files[0];
                this.handleFileUpload(file);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
    }

    handleFileUpload(file) {
        if (file) {
            p2p.sendFile(file);
            this.showToast(`Sending ${file.name}...`, 'info');
        }
    }

    _bindGlobalEvents() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const current = store.getSettings().theme;
                const newTheme = current === 'dark' ? 'light' : 'dark';
                store.updateSetting('theme', newTheme);
                this.updateTheme(newTheme);
            });
        }

        if (this.elements.brandToggle) this.elements.brandToggle.addEventListener('click', () => this.toggleSidebar());
        if (this.elements.mobileMenuToggle) this.elements.mobileMenuToggle.addEventListener('click', () => this.toggleSidebar());
        if (this.elements.sidebarClose) this.elements.sidebarClose.addEventListener('click', () => this.closeSidebar());
        if (this.elements.overlay) this.elements.overlay.addEventListener('click', () => this.closeSidebar());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSidebar();
        });

        window.addEventListener('online', () => {
            this.updateStatus('Online', 'success');
            this.showToast('Back online!', 'success');
        });

        window.addEventListener('offline', () => {
            this.updateStatus('Offline', 'neutral');
            this.showToast('You are offline.', 'warning');
        });

        window.addEventListener('resize', () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                this.elements.sidebar.classList.remove('collapsed');
            } else {
                if (this.elements.sidebar.classList.contains('open')) {
                    this.elements.sidebar.classList.remove('open');
                    if (this.elements.overlay) this.elements.overlay.classList.remove('active');
                }
            }
        });

        if (this.elements.btnClearCache) {
            this.elements.btnClearCache.addEventListener('click', () => {
                this.showConfirmationDialog(
                    'Delete all downloaded resources?',
                    async () => {
                        try {
                            const originalIcon = this.elements.btnClearCache.innerHTML;
                            this.elements.btnClearCache.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                            
                            await caches.delete('techbros-resources-v1');
                            localStorage.removeItem('techbros_settings');
                            this.showToast('Cache cleared. Reloading...', 'success');
                            setTimeout(() => location.reload(), 1500);
                        } catch (error) {
                            this.showToast('Error clearing cache', 'error');
                            this.elements.btnClearCache.innerHTML = '<i class="ph ph-trash"></i>';
                        }
                    }
                );
            });
        }

        if (this.elements.btnGrid) {
            this.elements.btnGrid.addEventListener('click', () => {
                this.elements.libraryList.classList.remove('list-view');
                this.elements.btnGrid.classList.add('active');
                this.elements.btnList.classList.remove('active');
                store.updateSetting('layout', 'grid');
            });
        }
        if (this.elements.btnList) {
            this.elements.btnList.addEventListener('click', () => {
                this.elements.libraryList.classList.add('list-view');
                this.elements.btnList.classList.add('active');
                this.elements.btnGrid.classList.remove('active');
                store.updateSetting('layout', 'list');
            });
        }

        let deferredPrompt;
        const installBtn = document.getElementById('btn-install-pwa');
        const installContainer = document.getElementById('install-container');
        
        const showInstalledState = () => {
            if (installContainer) {
                installContainer.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; color: var(--success); font-weight: 600;">
                        <i class="ph ph-check-circle" style="font-size: 1.5rem;"></i>
                        <span>App is installed</span>
                    </div>`;
            }
        };

        if (window.matchMedia('(display-mode: standalone)').matches) {
            showInstalledState();
        } else if (installBtn) {
            installBtn.classList.remove('hidden');
            
            installBtn.onclick = async () => {
                if (deferredPrompt) {
                    installBtn.disabled = true;
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        showInstalledState();
                    } else {
                        installBtn.disabled = false;
                    }
                    deferredPrompt = null;
                } else {
                    this.showToast('To install: Tap browser menu > Add to Home Screen', 'info');
                }
            };
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (installBtn) installBtn.disabled = false;
        });

        window.addEventListener('appinstalled', () => {
            showInstalledState();
            this.showToast('App installed successfully!', 'success');
        });
    }

    showConfirmationDialog(message, onConfirm) {
        const { confirmOverlay, confirmMessage, confirmBtn, cancelBtn } = this.elements;
        if (!confirmOverlay) return;

        confirmMessage.textContent = message;
        confirmOverlay.classList.remove('hidden');

        const close = () => {
            confirmOverlay.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        confirmBtn.onclick = () => {
            onConfirm();
            close();
        };

        cancelBtn.onclick = close;
    }

    _bindSearch() {
        if (!this.elements.searchInput) return;
        let timeout;
        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const results = await store.search(e.target.value);
                this.renderLibrary(results);
            }, 300);
        });
    }

    _bindP2PTabs() {
        if (!this.elements.p2pTabs) return;
        this.elements.p2pTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.p2pTabs.forEach(b => b.classList.remove('active'));
                this.elements.p2pTabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const targetId = `tab-${btn.dataset.tab}`;
                const targetContent = document.getElementById(targetId);
                if (targetContent) targetContent.classList.add('active');
            });
        });
    }

    _bindP2P() {
        if (p2p.peerId && this.elements.p2pPinDisplay) {
            this.elements.p2pPinDisplay.textContent = p2p.peerId;
            this.updateStatus('Online', 'success');
        }

        const manualSwitch = document.getElementById('manual-mode-switch');
        const manualArea = document.getElementById('manual-signal-area');
        const connectionForm = document.querySelector('.connection-form');
        const qrDisplay = document.getElementById('qr-display');
        const btnScan = document.getElementById('btn-scan-qr');
        let html5QrcodeScanner = null;

        if (manualSwitch) {
            manualSwitch.addEventListener('change', async (e) => {
                const isManual = e.target.checked;
                if (isManual) {
                    manualArea.classList.remove('hidden');
                    if(connectionForm) connectionForm.classList.add('hidden');
                    const isHost = document.querySelector('.p2p-tab-btn[data-tab="send"]').classList.contains('active');
                    await p2p.initManual(isHost);
                    this.updateStatus('Manual (Offline)', 'warning');
                } else {
                    manualArea.classList.add('hidden');
                    if(connectionForm) connectionForm.classList.remove('hidden');
                    await p2p.init();
                }
            });
        }

        p2p.addEventListener('signal-generated', (e) => {
            QRCode.toCanvas(e.detail, { errorCorrectionLevel: 'L' }, (err, canvas) => {
                if (err) { console.error(err); return; }
                qrDisplay.innerHTML = '';
                qrDisplay.appendChild(canvas);
                const p = document.createElement('p');
                p.textContent = 'Scan this on the other device';
                qrDisplay.appendChild(p);
            });
        });

        if (btnScan) {
            btnScan.addEventListener('click', () => {
                const readerElem = document.getElementById('qr-reader');
                readerElem.style.display = 'block';
                
                if (html5QrcodeScanner) html5QrcodeScanner.clear();

                html5QrcodeScanner = new Html5QrcodeScanner(
                    "qr-reader", { fps: 10, qrbox: 250 });
                
                html5QrcodeScanner.render((decodedText) => {
                    // Success
                    console.log(`Scan result: ${decodedText}`);
                    p2p.processManualSignal(decodedText);
                    html5QrcodeScanner.clear();
                    readerElem.style.display = 'none';
                    this.showToast('Signal Scanned!', 'success');
                }, (error) => {
                });
            });
        }

        p2p.addEventListener('ready', (e) => {
            if (this.elements.p2pPinDisplay) this.elements.p2pPinDisplay.textContent = e.detail.id;
            this.updateStatus('Online', 'success');
        });
        p2p.addEventListener('connected', (e) => {
            this.updateStatus(`Connected`, 'success');
            this.showToast('Peer connected!', 'success');
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

        if (this.elements.btnConnect) {
            this.elements.btnConnect.addEventListener('click', () => {
                const pin = document.getElementById('remote-pin').value;
                if (pin.length === 4) p2p.connect(pin);
            });
        }
    }

    navigateTo(viewId, addToHistory = true) {
        if (this.elements.views) this.elements.views.forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`${viewId}-view`);
        if (viewId !== 'resource') {
            if (this.elements.topBar) this.elements.topBar.classList.remove('hidden');
        }
        if (target) {
            target.classList.add('active');
            this.currentView = viewId;
            if (viewId !== 'resource' && this.elements.navLinks) {
                this.elements.navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${viewId}`) link.classList.add('active');
                });
            }
            if (addToHistory) {
                const url = viewId === 'library' ? '/' : `#${viewId}`;
                history.pushState({ view: viewId }, '', url);
            }
        }
    }

    updateStatus(msg, type = 'neutral') {
        if (this.elements.p2pStatus) {
            const text = this.elements.p2pStatus.querySelector('.text');
            if(text) text.textContent = msg;
            this.elements.p2pStatus.className = `status-indicator ${type}`;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => toast.remove(), 3300);
        }
    }

    _showFileNotification(filename, actionBtn) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.style.flexDirection = 'column';
        toast.style.alignItems = 'flex-start';
        const text = document.createElement('div');
        text.innerHTML = `Received <b>${this._sanitizeText(filename)}</b>`;
        toast.appendChild(text);
        toast.appendChild(actionBtn);
        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => toast.remove(), 10000);
        }
    }

    updateTheme(theme) { document.documentElement.setAttribute('data-theme', theme); }

    _getIconForType(type) {
        const map = { video: 'video', audio: 'music-note', pdf: 'file-pdf' };
        return `<i class="ph ph-${map[type] || 'file'}"></i>`;
    }

    _formatBytes(bytes) {
        if (!+bytes) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${['B', 'KB', 'MB', 'GB'][i]}`;
    }

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
        if (fileText) fileText.textContent = this._sanitizeText(filename);
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;
    }

    _clearTransferProgress() {
        const transferStatus = document.getElementById('transfer-status');
        if (transferStatus) transferStatus.innerHTML = '<div class="empty-log"><i class="ph ph-broadcast"></i><p>Waiting for connection...</p></div>';
    }
}

export const ui = new UI();