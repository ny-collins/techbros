import { store } from '../store.js';
import { security } from '../utils/security.js';
import { errorHandler } from '../utils/errorHandler.js';

export const common = {
    elements: {
        toastContainer: document.getElementById('toast-container'),
        confirmOverlay: document.getElementById('confirmation-overlay'),
        confirmMessage: document.getElementById('confirmation-message'),
        confirmBtn: document.getElementById('btn-confirm-ok'),
        cancelBtn: document.getElementById('btn-confirm-cancel'),
        p2pStatus: document.getElementById('p2p-status'),
        splashScreen: document.getElementById('splash-screen'),
        sidebar: document.getElementById('main-sidebar'),
        overlay: document.getElementById('sidebar-overlay'),
    },

    /* === INITIALIZATION === */

    init() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const current = store.getSettings().theme;
                const newTheme = current === 'dark' ? 'light' : 'dark';
                store.updateSetting('theme', newTheme);
                this.updateTheme(newTheme);
            });
        }

        this.updateTheme(store.getSettings().theme);

        const brandToggle = document.getElementById('brand-toggle');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const sidebarClose = document.getElementById('sidebar-close');

        if (brandToggle) brandToggle.addEventListener('click', () => this.toggleSidebar());
        if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', () => this.toggleSidebar());
        if (sidebarClose) sidebarClose.addEventListener('click', () => this.closeSidebar());
        if (this.elements.overlay) this.elements.overlay.addEventListener('click', () => this.closeSidebar());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSidebar();
        });

        window.addEventListener('online', () => {
            this.updateStatus('Internet Connected', 'success');
            this.showToast('Back online!', 'success');
        });

        window.addEventListener('offline', () => {
            this.updateStatus('No Internet', 'neutral');
            this.showToast('You are offline.', 'warning');
        });

        if (navigator.onLine) {
            this.updateStatus('Internet Connected', 'success');
        } else {
             this.updateStatus('No Internet', 'neutral');
        }

        const versionEl = document.getElementById('app-version-sidebar');
        if (versionEl) {
            const v = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Dev';
            versionEl.textContent = `v${v}`;
        }
        
        window.addEventListener('app-error', (e) => {
            const { error, context, message } = e.detail;
            console.error(`[${context}] Application Error:`, error);
            
            let userMessage = message;
            if (error.name === 'QuotaExceededError') {
                userMessage = 'Storage full. Please clear some cached files.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                userMessage = 'Network error. Check your connection.';
            } else if (error.message.includes('integrity')) {
                userMessage = 'File verification failed. File may be corrupted.';
            }
            
            this.showError(userMessage, context);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            console.error('[Unhandled Promise Rejection]:', e.reason);
            this.showError('An unexpected error occurred. Please try again.', 'System');
            e.preventDefault();
        });
    },

    /* === SPLASH SCREEN === */

    hideSplashScreen() {
        if (this.elements.splashScreen) {
            this.elements.splashScreen.classList.add('hidden');
        }
    },

    /* === THEME & LAYOUT === */

    updateTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
            }
        }
    },

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
    },

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
    },

    /* === FEEDBACK & DIALOGS === */

    showToast(message, type = 'info', duration = 3300) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const sanitizedMessage = security.sanitizeText(message);
        toast.innerHTML = `
            <span class="toast-message">${sanitizedMessage}</span>
            <button class="toast-close" aria-label="Close">
                <i class="ph ph-x"></i>
            </button>
        `;
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => toast.remove());
        
        if (this.elements.toastContainer) {
            this.elements.toastContainer.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            
            if (duration > 0) {
                setTimeout(() => {
                    if (toast.parentNode) toast.remove();
                }, duration);
            }
        }
        
        return toast;
    },

    showError(error, context = 'Operation') {
        let message = `${context} failed`;
        
        if (error instanceof Error) {
            message = error.message || message;
        } else if (typeof error === 'string') {
            message = error;
        } else if (error?.detail?.message) {
            message = error.detail.message;
        }
        
        console.error(`[${context}]`, error);
        return this.showToast(message, 'error', 5000);
    },

    showRetryableError(message, retryFn, context = 'Operation') {
        const toast = document.createElement('div');
        toast.className = 'toast toast-error toast-retry';
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <div class="toast-actions">
                <button class="btn btn-small btn-retry">Retry</button>
                <button class="toast-close" aria-label="Close">
                    <i class="ph ph-x"></i>
                </button>
            </div>
        `;
        
        const retryBtn = toast.querySelector('.btn-retry');
        const closeBtn = toast.querySelector('.toast-close');
        
        retryBtn.addEventListener('click', () => {
            toast.remove();
            retryFn();
        });
        
        closeBtn.addEventListener('click', () => toast.remove());
        
        if (this.elements.toastContainer) {
            this.elements.toastContainer.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
        }
        
        return toast;
    },

    confirmAction(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const { confirmOverlay, confirmMessage, confirmBtn, cancelBtn } = this.elements;
            if (!confirmOverlay) {
                resolve(false);
                return;
            }

            confirmMessage.textContent = message;
            confirmOverlay.classList.remove('hidden');

            const close = () => {
                confirmOverlay.classList.add('hidden');
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            confirmBtn.onclick = () => {
                close();
                resolve(true);
            };

            cancelBtn.onclick = () => {
                close();
                resolve(false);
            };
        });
    },

    showConfirmationDialog(message, onConfirm, onCancel = null) {
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

        cancelBtn.onclick = () => {
            if (onCancel) onCancel();
            close();
        };
    },

    updateStatus(msg, type = 'neutral') {
        if (this.elements.p2pStatus) {
            const text = this.elements.p2pStatus.querySelector('.text');
            if(text) text.textContent = msg;
            this.elements.p2pStatus.className = `status-indicator ${type}`;
        }
    },

    /* === UTILITIES === */

    sanitizeText(str) {
        if (!str) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            "/": '&#x2F;',
        };
        const reg = /[&<>"'/]/ig;
        return str.replace(reg, (match) => (map[match]));
    },

    formatBytes(bytes) {
        if (!+bytes) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${['B', 'KB', 'MB', 'GB'][i]}`;
    },

    /* === ERROR HANDLING === */

    handleNetworkError(error, operation = 'Network operation') {
        if (!navigator.onLine) {
            return this.showToast('You are offline. Check your connection.', 'warning');
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return this.showToast('Connection failed. Please try again.', 'error');
        }
        
        return this.showError(error, operation);
    },

    createLoadingElement(message = 'Loading...') {
        const loader = document.createElement('div');
        loader.className = 'loading-state';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <span class="loading-message">${message}</span>
        `;
        return loader;
    },

    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.appendChild(this.createLoadingElement(message));
        document.body.appendChild(overlay);
        return overlay;
    },

    /* === EXPORT FUNCTIONALITY === */

    exportSettings() {
        const settings = {
            theme: store.state.settings.theme || 'dark',
            layout: store.state.settings.layout || 'grid',
            searchHistory: store.state.settings.searchHistory || [],
            exportedAt: new Date().toISOString(),
            version: '3.0.0'
        };

        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `techbros-settings-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Settings exported successfully', 'success');
    },

    async exportCatalog() {
        const resources = store.state.resources || [];
        
        const catalog = {
            totalFiles: resources.length,
            exportedAt: new Date().toISOString(),
            version: '3.0.0',
            resources: resources.map(r => ({
                name: r.name,
                type: r.type,
                size: r.size,
                addedAt: r.addedAt || 'Unknown'
            }))
        };

        const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `techbros-catalog-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast(`Exported ${resources.length} resources`, 'success');
    },

    async updateStorageInfo() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const used = estimate.usage || 0;
                const quota = estimate.quota || 0;
                
                const usedMB = (used / (1024 * 1024)).toFixed(2);
                const quotaMB = (quota / (1024 * 1024)).toFixed(2);
                const percentage = quota > 0 ? ((used / quota) * 100).toFixed(1) : 0;

                const info = document.getElementById('storage-info');
                if (info) {
                    info.innerHTML = `Using <strong>${usedMB} MB</strong> of <strong>${quotaMB} MB</strong> available (<strong>${percentage}%</strong>)`;
                }
            } else {
                const info = document.getElementById('storage-info');
                if (info) {
                    info.textContent = 'Storage information not available in this browser';
                }
            }
        } catch (error) {
            console.error('[Common] Storage estimate failed:', error);
        }
    },

    async clearAllData() {
        const confirmed = await this.confirmAction(
            'Are you sure you want to clear all data? This will remove all cached resources and settings. This action cannot be undone.',
            'Clear All Data'
        );

        if (confirmed) {
            try {
                // Clear all caches
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }
                
                if ('indexedDB' in window) {
                    const dbs = ['techbros-db', 'p2p-transfers'];
                    for (const dbName of dbs) {
                        try {
                            indexedDB.deleteDatabase(dbName);
                        } catch (e) {
                            console.warn(`Failed to delete ${dbName}:`, e);
                        }
                    }
                }

                localStorage.clear();
                sessionStorage.clear();

                this.showToast('All data cleared successfully. Reloading...', 'success');
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (error) {
                this.showError(error, 'Clear data');
            }
        }
    }
};
