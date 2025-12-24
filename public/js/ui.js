import { store } from './store.js';
import { p2p } from './p2p.js';

class UI {
    constructor() {
        this.elements = {};
        this.currentView = 'library';
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
            searchInput: document.getElementById('search-input'),
            p2pPinDisplay: document.getElementById('my-pin-display'),
            p2pStatus: document.getElementById('p2p-status'),
            fileInput: document.getElementById('file-upload'),

            btnClearCache: document.getElementById('btn-clear-cache'),
            btnGrid: document.getElementById('view-grid'),
            btnList: document.getElementById('view-list'),
            btnConnect: document.getElementById('btn-connect'),
            btnSend: document.getElementById('btn-send-file'),

            playerContainer: document.getElementById('player-container'),
            backButton: document.getElementById('btn-back-library'),

            notificationArea: document.getElementById('notification-area')
        };

        this._bindNavigation();
        this._bindSearch();
        this._bindP2P();
        this._bindGlobalEvents();
        
        this.renderLibrary(store.getResources());
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
        const aboutVer = document.getElementById('app-version-about');
        if (sidebarVer) sidebarVer.textContent = `v${version}`;
        if (aboutVer) aboutVer.textContent = `Version ${version}`;

        if (this.elements.splashScreen) {
            setTimeout(() => {
                this.elements.splashScreen.classList.add('hidden');
            }, 1500);
        }

        if (navigator.onLine) {
            this.updateStatus('Online', 'success');
        } else {
            this.updateStatus('Offline', 'neutral');
        }

        console.log('[UI] Initialized');
    }

    toggleSidebar() {
        if (!this.elements.sidebar) return;

        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Ensure collapsed class is removed on mobile
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
            // Ensure collapsed class is removed on mobile
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
                <div class="empty-state">
                    <i class="ph ph-magnifying-glass" style="font-size: 48px; opacity: 0.5;"></i>
                    <p>No resources found.</p>
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

        const iconDiv = document.createElement('div');
        iconDiv.className = 'card-icon';
        iconDiv.innerHTML = this._getIconForType(data.type);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'card-content';

        const title = document.createElement('h3');
        title.textContent = this._sanitizeText(data.title);

        const meta = document.createElement('span');
        meta.className = 'meta';
        meta.textContent = `${data.type.toUpperCase()} • ${this._formatBytes(data.size || 0)}`;

        contentDiv.appendChild(title);
        contentDiv.appendChild(meta);

        div.appendChild(iconDiv);
        div.appendChild(contentDiv);

        return div;
    }

    _sanitizeText(str) {
        if (!str) return '';
        return str.replace(/[<>]/g, '');
    }

    openResource(resource) {
        if (this.elements.topBar) this.elements.topBar.classList.add('hidden');

        this.closeSidebar();

        const container = this.elements.playerContainer;
        if (container) container.innerHTML = '';

        if (resource.type === 'audio') {
            const card = document.createElement('div');
            card.className = 'audio-player-card';
            const coverSrc = resource.cover ? resource.cover : '';

            const imgHTML = coverSrc
                ? `<img src="${coverSrc}" class="player-cover-art" alt="Cover" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'player-cover-art\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:4rem;color:var(--text-secondary);\\'><i class=\\'ph ph-music-note\\'></i></div>'">`
                : `<div class="player-cover-art" style="display:flex;align-items:center;justify-content:center;font-size:4rem;color:var(--text-secondary);"><i class="ph ph-music-note"></i></div>`;

            card.innerHTML = `
                ${imgHTML}
                <div class="player-meta">
                    <h2>${this._sanitizeText(resource.title)}</h2>
                </div>
                <audio controls autoplay src="${resource.url}"></audio>
            `;
            if(container) container.appendChild(card);
        } else if (resource.type === 'video') {
            const video = document.createElement('video');
            video.className = 'full-viewer';
            video.controls = true; video.autoplay = true; video.src = resource.url;
            video.onerror = () => this.showToast('Error loading video', 'error');
            if(container) container.appendChild(video);
        } else if (resource.type === 'pdf') {
            const iframe = document.createElement('iframe');
            iframe.className = 'full-viewer';
            iframe.src = resource.url;
            if(container) container.appendChild(iframe);
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

    _bindNavigation() {
        if (this.elements.navLinks) {
            this.elements.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const linkEl = e.currentTarget;
                    const target = linkEl.getAttribute('href').substring(1);

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

        if (this.elements.brandToggle) {
            this.elements.brandToggle.addEventListener('click', () => this.toggleSidebar());
        }
        if (this.elements.mobileMenuToggle) {
            this.elements.mobileMenuToggle.addEventListener('click', () => this.toggleSidebar());
        }
        if (this.elements.sidebarClose) {
            this.elements.sidebarClose.addEventListener('click', () => this.closeSidebar());
        }
        if (this.elements.overlay) {
            this.elements.overlay.addEventListener('click', () => this.closeSidebar());
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSidebar();
        });

        window.addEventListener('online', () => {
            this.updateStatus('Online', 'success');
            this.showToast('Back online!', 'success');
        });

        window.addEventListener('offline', () => {
            this.updateStatus('Offline', 'neutral');
            this.showToast('You are offline. Some features may be limited.', 'warning');
        });

        // Handle window resize to ensure sidebar state is correct for screen size
        window.addEventListener('resize', () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                // On mobile, ensure no collapsed class
                this.elements.sidebar.classList.remove('collapsed');
            } else {
                // On desktop, if sidebar is open (mobile state), close it
                if (this.elements.sidebar.classList.contains('open')) {
                    this.elements.sidebar.classList.remove('open');
                    if (this.elements.overlay) this.elements.overlay.classList.remove('active');
                }
            }
        });

        if (this.elements.btnClearCache) {
            this.elements.btnClearCache.addEventListener('click', () => {
                this.showConfirmationDialog(
                    'This will clear all downloaded resources and local storage. This action cannot be undone.',
                    async () => {
                        console.log('[UI] Starting cache clearing process');

                        const clearButton = this.elements.btnClearCache;
                        if (!clearButton) {
                            console.error('[UI] Clear cache button not found');
                            return;
                        }

                        const originalIcon = clearButton.innerHTML;
                        const originalTooltip = clearButton.getAttribute('data-tooltip');
                        clearButton.innerHTML = '<i class="ph-spinner ph-spin"></i>';
                        clearButton.setAttribute('data-tooltip', 'Clearing cache...');
                        clearButton.disabled = true;

                        try {
                            console.log('[UI] Checking service worker status:', navigator.serviceWorker.controller);

                            if (!navigator.serviceWorker.controller) {
                                console.warn('[UI] Service worker not active, but proceeding with cache clearing');
                            }

                            this.showToast('Clearing cache...', 'info');

                            console.log('[UI] Deleting cache...');
                            const deleted = await caches.delete('techbros-resources-v1');
                            console.log('[UI] Resource cache deleted:', deleted);

                            console.log('[UI] Clearing localStorage...');
                            localStorage.removeItem('techbros_settings');

                            this.showToast('Cache cleared successfully! Reloading...', 'success');

                            setTimeout(() => {
                                console.log('[UI] Reloading page...');
                                location.reload();
                            }, 1500);

                        } catch (error) {
                            console.error('[UI] Error clearing cache:', error);
                            this.showToast('Error clearing cache', 'error');

                            if (clearButton) {
                                clearButton.innerHTML = originalIcon;
                                clearButton.setAttribute('data-tooltip', originalTooltip);
                                clearButton.disabled = false;
                            }
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

    _bindP2P() {
        p2p.addEventListener('ready', (e) => {
            if (this.elements.p2pPinDisplay) this.elements.p2pPinDisplay.textContent = e.detail.id;
            this.updateStatus('Online', 'success');
        });
        p2p.addEventListener('connected', (e) => {
            this.updateStatus(`Connected`, 'success');
            this.showToast('Peer connected!', 'success');
            if (this.elements.btnSend) this.elements.btnSend.style.display = 'inline-flex';
        });

        p2p.addEventListener('file-received', (e) => {
            const { blob, name, mime } = e.detail;
            console.log(`[UI] File received: ${name}`);

            const url = URL.createObjectURL(blob);

            const downloadBtn = document.createElement('a');
            downloadBtn.href = url;
            downloadBtn.download = name;
            downloadBtn.className = 'btn primary small';
            downloadBtn.textContent = 'Save to Device';
            downloadBtn.style.marginTop = '0.5rem';

            this._showFileNotification(name, downloadBtn);
        });

        p2p.addEventListener('send-progress', (e) => {
            const { name, progress } = e.detail;
            this._updateTransferProgress('Sending', name, progress);
        });

        p2p.addEventListener('receive-progress', (e) => {
            const { name, progress } = e.detail;
            this._updateTransferProgress('Receiving', name, progress);
        });

        p2p.addEventListener('send-complete', (e) => {
            const { name } = e.detail;
            this._updateTransferProgress('Sent', name, 100);
            setTimeout(() => this._clearTransferProgress(), 3000);
        });

        p2p.addEventListener('transfer-start', (e) => {
            const { name } = e.detail;
            this._updateTransferProgress('Starting', name, 0);
        });

        if (this.elements.btnConnect) {
            this.elements.btnConnect.addEventListener('click', () => {
                const pin = document.getElementById('remote-pin').value;
                if (pin.length === 4) p2p.connect(pin);
            });
        }

        if (this.elements.btnSend) {
            this.elements.btnSend.addEventListener('click', () => this.elements.fileInput.click());
            this.elements.fileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    p2p.sendFile(e.target.files[0]);
                    this.showToast(`Sending ${e.target.files[0].name}...`, 'info');
                }
            });
        }
    }

    navigateTo(viewId, addToHistory = true) {
        if (this.elements.views) {
            this.elements.views.forEach(el => el.classList.remove('active'));
        }
        
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

    showConfirmationDialog(message, onConfirm, onCancel = null) {
        const overlay = document.createElement('div');
        overlay.className = 'confirmation-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(2px);
        `;

        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        dialog.style.cssText = `
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
        `;

        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            margin: 0 0 2rem 0;
            color: var(--text-primary);
            font-size: 1rem;
            line-height: 1.5;
        `;

        const buttons = document.createElement('div');
        buttons.style.cssText = `
            display: flex;
            gap: 1rem;
            justify-content: center;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.flex = '1';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
        });

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn danger';
        confirmBtn.textContent = 'Clear Cache';
        confirmBtn.style.flex = '1';
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            onConfirm();
        });

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                if (onCancel) onCancel();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        buttons.appendChild(cancelBtn);
        buttons.appendChild(confirmBtn);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttons);
        overlay.appendChild(dialog);

        document.body.appendChild(overlay);

        setTimeout(() => confirmBtn.focus(), 100);
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

        let validContainer = container;
        if (!validContainer) {
            validContainer = document.createElement('div');
            validContainer.id = 'toast-container';
            validContainer.style.position = 'fixed';
            validContainer.style.bottom = '2rem';
            validContainer.style.right = '2rem';
            validContainer.style.display = 'flex';
            validContainer.style.flexDirection = 'column';
            validContainer.style.gap = '10px';
            validContainer.style.zIndex = '2000';
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                validContainer.style.bottom = '1rem';
                validContainer.style.right = '1rem';
                validContainer.style.left = '1rem';
                validContainer.style.maxWidth = 'none';
            }
            document.body.appendChild(validContainer);
        }

        validContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => toast.remove(), 10000);
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

        const progressBar = transferStatus.querySelector('.progress-bar') || this._createProgressBar(transferStatus);

        transferStatus.innerHTML = `
            <div class="transfer-info">
                <strong>${status}:</strong> ${this._sanitizeText(filename)}
            </div>
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progress}%"></div>
                <span class="progress-text">${Math.round(progress)}%</span>
            </div>
        `;
    }

    _clearTransferProgress() {
        const transferStatus = document.getElementById('transfer-status');
        if (transferStatus) {
            transferStatus.innerHTML = '<em>Waiting for connection...</em>';
        }
    }

    _createProgressBar(container) {
        return null;
    }
}

export const ui = new UI();