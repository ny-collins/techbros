import { store } from '../store.js';

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
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
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
    }
};
