/**
 * TechBros UI Controller (v2.0)
 * Handles DOM manipulation, Event Listeners, and View Rendering.
 */

import { store } from './store.js';
import { p2p } from './p2p.js';

class UI {
    constructor() {
        this.elements = {};
        this.currentView = 'library';
    }

    init() {
        // Cache DOM elements
        this.elements = {
            app: document.getElementById('app'),
            splashScreen: document.getElementById('splash-screen'), // New Splash
            sidebar: document.getElementById('main-sidebar'),
            brandToggle: document.getElementById('brand-toggle'),
            sidebarClose: document.getElementById('sidebar-close'),
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
        
        // Hide Splash Screen after slight delay for effect
        if (this.elements.splashScreen) {
            setTimeout(() => {
                this.elements.splashScreen.classList.add('hidden');
            }, 1500); // 1.5s delay
        }
        
        console.log('[UI] Initialized');
    }

    // --- Sidebar Logic ---
    toggleSidebar() {
        if (!this.elements.sidebar) return;
        
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
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
            this.elements.sidebar.classList.remove('open');
            if (this.elements.overlay) this.elements.overlay.classList.remove('active');
        } else {
            this.elements.sidebar.classList.add('collapsed');
        }
    }

    // --- Rendering Logic ---
    renderLibrary(resources) {
        if (!this.elements.libraryList) return;
        
        // If we have resources, clear the container (removing skeletons)
        // If resources is empty, we show empty state.
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
        div.addEventListener('click', () => this.openResource(data));
        
        // Sanitize title to prevent XSS
        const safeTitle = this._sanitize(data.title);

        div.innerHTML = `
            <div class="card-icon">${this._getIconForType(data.type)}</div>
            <div class="card-content">
                <h3>${safeTitle}</h3>
                <span class="meta">${data.type.toUpperCase()} • ${this._formatBytes(data.size || 0)}</span>
            </div>
        `;
        return div;
    }
    
    _sanitize(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
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
            
            // Image with Error Handling
            const imgHTML = coverSrc 
                ? `<img src="${coverSrc}" class="player-cover-art" alt="Cover" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'player-cover-art\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:4rem;color:var(--text-secondary);\\'><i class=\\'ph ph-music-note\\'></i></div>'">`
                : `<div class="player-cover-art" style="display:flex;align-items:center;justify-content:center;font-size:4rem;color:var(--text-secondary);"><i class="ph ph-music-note"></i></div>`;

            card.innerHTML = `
                ${imgHTML}
                <div class="player-meta">
                    <h2>${this._sanitize(resource.title)}</h2>
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

    // --- Event Binding ---
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
        if (this.elements.sidebarClose) {
            this.elements.sidebarClose.addEventListener('click', () => this.closeSidebar());
        }
        if (this.elements.overlay) {
            this.elements.overlay.addEventListener('click', () => this.closeSidebar());
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSidebar();
        });

        if (this.elements.btnClearCache) {
            this.elements.btnClearCache.addEventListener('click', async () => {
                if (confirm('Clear all downloaded resources?')) {
                    await caches.delete('techbros-resources-v1');
                    location.reload();
                }
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
            timeout = setTimeout(() => {
                const results = store.search(e.target.value);
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

        // Handle incoming files
        p2p.addEventListener('file-received', (e) => {
            const { blob, name, mime } = e.detail;
            console.log(`[UI] File received: ${name}`);
            
            // Create object URL
            const url = URL.createObjectURL(blob);
            
            // Create a "Download" toast/notification
            // We use a persistent element or a special toast that requires interaction
            const downloadBtn = document.createElement('a');
            downloadBtn.href = url;
            downloadBtn.download = name;
            downloadBtn.className = 'btn primary small';
            downloadBtn.textContent = 'Save to Device';
            downloadBtn.style.marginTop = '0.5rem';
            
            // Auto-click if allowed? No, browsers block it.
            // We append this to the notification area or a modal
            this._showFileNotification(name, downloadBtn);
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

    navigateTo(viewId) {
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
        text.innerHTML = `Received <b>${this._sanitize(filename)}</b>`;
        
        toast.appendChild(text);
        toast.appendChild(actionBtn); // The download button
        
        const container = document.getElementById('toast-container'); // Ensure this exists in HTML or create it
        
        // If container doesn't exist (it wasn't in original analysis), create it dynamically
        let validContainer = container;
        if (!validContainer) {
            validContainer = document.createElement('div');
            validContainer.id = 'toast-container';
            validContainer.style.position = 'fixed';
            validContainer.style.bottom = '20px';
            validContainer.style.right = '20px';
            validContainer.style.display = 'flex';
            validContainer.style.flexDirection = 'column';
            validContainer.style.gap = '10px';
            validContainer.style.zIndex = '1000';
            document.body.appendChild(validContainer);
        }

        validContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        
        // Don't auto-dismiss valuable file transfers immediately, give them time or wait for click
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
}

export const ui = new UI();