import { store } from '../store.js';
import { common } from './common.js';
import { security } from '../utils/security.js';

export const library = {
    elements: {
        list: document.getElementById('resource-list'),
        filterContainer: document.getElementById('filter-container'),
        searchInput: document.getElementById('search-input'),
        btnGrid: document.getElementById('view-grid'),
        btnList: document.getElementById('view-list'),
        btnClearCache: document.getElementById('btn-clear-cache'),
        fileInput: null
    },
    activeFilter: 'all',
    currentFolder: null,

    /* === INITIALIZATION === */

    init(router, viewer) {
        this.viewer = viewer;
        this.router = router;

        this._bindSearch();
        this._bindViewToggles();
        this._bindCacheClear();
        this._bindUpload();

        this.renderHome();
    },

    reset() {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        this.renderHome();
    },

    /* === RENDERING === */

    renderHome() {
        try {
            this._renderHomeContent();
        } catch (error) {
            console.error('[Library] Error rendering home:', error);
            this._renderErrorState('home', error.message);
        }
    },
    
    _showLoadingSkeletons() {
        if (!this.elements.list) return;
        
        this.elements.list.innerHTML = '';
        this.elements.list.className = '';
        
        const pinnedSection = document.createElement('section');
        pinnedSection.className = 'dashboard-section';
        pinnedSection.innerHTML = `
            <div class="section-header">
                <h2>Pinned Files</h2>
            </div>
            <div class="pinned-scroll-container">
                ${Array(3).fill('<div class="resource-card skeleton"></div>').join('')}
            </div>
        `;
        
        const categoriesSection = document.createElement('section');
        categoriesSection.className = 'dashboard-section';
        categoriesSection.innerHTML = `
            <div class="section-header">
                <h2>Categories <span class="header-count skeleton-text">Loading...</span></h2>
            </div>
            <div class="category-grid">
                ${Array(6).fill('<div class="category-card skeleton"></div>').join('')}
            </div>
        `;
        
        this.elements.list.appendChild(pinnedSection);
        this.elements.list.appendChild(categoriesSection);
    },

    _renderHomeContent() {
        this.currentFolder = null;
        if (!this.elements.list) return;

        this._toggleViewControls(false);

        this.elements.filterContainer.innerHTML = '';
        this.elements.list.innerHTML = '';
        this.elements.list.className = ''; 

        const pinnedResources = store.getPinnedResources();
        const pinnedWrapper = document.createElement('section');
        pinnedWrapper.className = 'dashboard-section';
        pinnedWrapper.innerHTML = `
            <div class="section-header">
                <h2>Pinned Files</h2>
            </div>
        `;

        if (pinnedResources.length > 0) {
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'pinned-scroll-container';
            pinnedResources.forEach(res => {
                scrollContainer.appendChild(this._createResourceCard(res));
            });
            pinnedWrapper.appendChild(scrollContainer);
        } else {
            const empty = document.createElement('div');
            empty.className = 'empty-pinned-state';
            empty.innerHTML = `
                <i class="ph ph-push-pin"></i>
                <p><strong>No pinned files yet.</strong><br>Your pinned files appear here for quick access and even offline use.</p>
            `;
            pinnedWrapper.appendChild(empty);
        }

        this.elements.list.appendChild(pinnedWrapper);

        const resources = store.getResources();
        
        if (resources.length === 0) {
            const emptyLibrary = document.createElement('div');
            emptyLibrary.className = 'empty-library-state';
            emptyLibrary.innerHTML = `
                <div class="empty-library-icon">
                    <i class="ph ph-books"></i>
                </div>
                <h2>Welcome to TechBros Library</h2>
                <p>Your library is empty. Get started by adding your first resource!</p>
                <div class="empty-library-actions">
                    <button class="btn primary" onclick="document.querySelector('.category-card.special-action')?.click() || this.closest('.empty-library-state').dispatchEvent(new CustomEvent('upload-trigger', {bubbles: true}))">
                        <i class="ph ph-cloud-arrow-up"></i> Upload File
                    </button>
                    <p class="empty-library-hint">
                        <i class="ph ph-info"></i>
                        Supported formats: PDF, Video, Audio, Images
                    </p>
                </div>
            `;
            emptyLibrary.addEventListener('upload-trigger', () => this.triggerUploadFlow());
            this.elements.list.appendChild(emptyLibrary);
            return;
        }
        
        const stats = this._calculateStats(resources);
        const categoriesWrapper = document.createElement('section');
        categoriesWrapper.className = 'dashboard-section';
        categoriesWrapper.innerHTML = `
            <div class="section-header">
                <h2>Categories <span class="header-count">${resources.length} files total</span></h2>
            </div>
        `;

        const grid = document.createElement('div');
        grid.className = 'category-grid';

        const categories = [
            { id: 'video', name: 'Videos', icon: 'video', count: stats.video },
            { id: 'audio', name: 'Audio', icon: 'music-note', count: stats.audio },
            { id: 'pdf', name: 'Documents', icon: 'file-pdf', count: stats.pdf },
            { id: 'image', name: 'Images', icon: 'image', count: stats.image },
            { id: 'other', name: 'Other Files', icon: 'file', count: stats.other }
        ];

        categories.forEach(cat => {
            if (cat.count > 0) {
                grid.appendChild(this._createCategoryCard(cat));
            }
        });

        grid.appendChild(this._createCategoryCard({ 
            id: 'upload', 
            name: 'Upload File', 
            icon: 'cloud-arrow-up', 
            count: 'Add New' 
        }));

        categoriesWrapper.appendChild(grid);
        this.elements.list.appendChild(categoriesWrapper);
    },

    renderFolder(folderId) {
        this.currentFolder = folderId;
        this.elements.list.className = 'resource-grid'; 
        
        this._toggleViewControls(true);
        
        const allResources = store.getResources();
        const filtered = folderId === 'other' 
            ? allResources.filter(r => !['video', 'audio', 'pdf', 'image'].includes(r.type))
            : allResources.filter(r => r.type === folderId);

        this._renderBreadcrumbs(folderId);
        this.renderList(filtered);
    },

    _toggleViewControls(show) {
        const controls = document.querySelector('.view-toggles');
        if (controls) controls.style.display = show ? 'flex' : 'none';
    },

    _renderBreadcrumbs(folderName) {
        this.elements.filterContainer.innerHTML = '';
        
        const nav = document.createElement('div');
        nav.className = 'breadcrumb';

        const backBtn = document.createElement('button');
        backBtn.className = 'btn-back';
        backBtn.innerHTML = '<i class="ph ph-arrow-left"></i> Back to Home';
        backBtn.onclick = () => this.renderHome();
        backBtn.setAttribute('aria-label', 'Back to Home');

        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.innerHTML = '<i class="ph ph-caret-right"></i>';

        const currentName = folderName.charAt(0).toUpperCase() + folderName.slice(1);
        const current = document.createElement('span');
        current.className = 'breadcrumb-item active';
        current.textContent = currentName === 'Pdf' ? 'Documents' : currentName;

        nav.appendChild(backBtn);
        nav.appendChild(separator);
        nav.appendChild(current);

        this.elements.filterContainer.appendChild(nav);
    },

    _createResourceCard(data) {
        const div = document.createElement('div');
        div.className = 'resource-card';
        div.setAttribute('tabindex', '0');
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', `Open ${common.sanitizeText(data.title)}`);

        div.addEventListener('click', (e) => {
            if (e.target.closest('.btn-pin')) return;
            if (this.viewer && this.router) this.viewer.open(data, this.router);
        });

        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (this.viewer && this.router) this.viewer.open(data, this.router);
            }
        });

        const isPinned = store.isPinned(data.id);
        const pinBtn = document.createElement('button');
        pinBtn.className = `btn-pin ${isPinned ? 'active' : ''}`;
        pinBtn.innerHTML = `<i class="ph ${isPinned ? 'ph-push-pin-fill' : 'ph-push-pin'}"></i>`;
        
        pinBtn.onclick = async (e) => {
            e.stopPropagation();
            
            pinBtn.disabled = true;
            const originalIcon = pinBtn.innerHTML;
            pinBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

            try {
                const newState = await store.togglePin(data.id);
                pinBtn.classList.toggle('active', newState);
                pinBtn.innerHTML = `<i class="ph ${newState ? 'ph-push-pin-fill' : 'ph-push-pin'}"></i>`;
                
                if (newState) {
                    common.showToast('File pinned & downloaded!', 'success');
                } else {
                    common.showToast('File unpinned & removed from cache.', 'info');
                }

                if (this.currentFolder === null) {
                    this.renderHome();
                }
            } catch (err) {
                common.showToast('Failed to pin file. Check connection.', 'error');
                pinBtn.innerHTML = originalIcon;
            } finally {
                pinBtn.disabled = false;
            }
        };
        div.appendChild(pinBtn);

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

        const storageBadge = document.createElement('span');
        storageBadge.className = data.isCloud ? 'badge-cloud' : 'badge-local';
        storageBadge.innerHTML = data.isCloud 
            ? '<i class="ph ph-cloud"></i> Cloud' 
            : '<i class="ph ph-device-mobile"></i> Local';
        storageBadge.setAttribute('title', data.isCloud ? 'Stored in cloud' : 'Downloaded locally');
        div.appendChild(storageBadge);

        const iconDiv = document.createElement('div');
        iconDiv.className = 'card-icon';
        iconDiv.innerHTML = this._getIconForType(data.type);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'card-content';

        const title = document.createElement('h3');
        title.textContent = common.sanitizeText(data.title);

        const meta = document.createElement('div');
        meta.className = 'meta';

        const typeName = data.type.toUpperCase();
        const typeSpan = document.createElement('span');
        typeSpan.innerHTML = `<i class="ph ph-file"></i> ${typeName === 'PDF' ? 'DOCUMENT' : typeName}`;

        const sizeSpan = document.createElement('span');
        sizeSpan.innerHTML = `<i class="ph ph-package"></i> ${common.formatBytes(data.size || 0)}`;

        const dateSpan = document.createElement('span');
        if (data.added) {
            const date = new Date(data.added);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            let dateStr;
            if (diffDays === 0) dateStr = 'Today';
            else if (diffDays === 1) dateStr = 'Yesterday';
            else if (diffDays < 7) dateStr = `${diffDays} days ago`;
            else dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dateSpan.innerHTML = `<i class="ph ph-clock"></i> ${dateStr}`;
            meta.appendChild(dateSpan);
        }

        meta.appendChild(typeSpan);
        meta.appendChild(sizeSpan);

        contentDiv.appendChild(title);
        contentDiv.appendChild(meta);

        div.appendChild(iconDiv);
        div.appendChild(contentDiv);

        return div;
    },

    _createCategoryCard(cat) {
        const div = document.createElement('div');
        div.className = 'category-card';
        div.setAttribute('tabindex', '0');
        div.setAttribute('role', 'button');
        
        if (cat.id === 'upload') {
            div.classList.add('special-action');
            div.setAttribute('aria-label', `Upload new file`);
            div.onclick = () => this.triggerUploadFlow();
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.triggerUploadFlow();
                }
            });
        } else {
            div.setAttribute('aria-label', `Open ${cat.name} category with ${cat.count} items`);
            div.onclick = () => this.renderFolder(cat.id);
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.renderFolder(cat.id);
                }
            });
        }

        div.innerHTML = `
            <div class="category-icon">
                <i class="ph ph-${cat.icon}"></i>
            </div>
            <div class="category-info">
                <h3>${cat.name}</h3>
                <p>${cat.count} ${cat.id === 'upload' ? '' : 'items'}</p>
            </div>
        `;
        return div;
    },

    _calculateStats(resources) {
        const stats = { video: 0, audio: 0, pdf: 0, image: 0, other: 0 };
        resources.forEach(r => {
            if (stats[r.type] !== undefined) stats[r.type]++;
            else stats.other++;
        });
        return stats;
    },

    renderList(resources) {
        if (!this.elements.list) return;
        this.elements.list.innerHTML = '';
        
        if (resources.length === 0) {
            this.elements.list.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align:center; padding: 4rem; color: var(--text-muted);">
                    <i class="ph ph-ghost" style="font-size: 64px; margin-bottom: 1rem; opacity: 0.8;"></i>
                    <p style="color: var(--text-main); font-weight: 500;">No resources found in this category.</p>
                    <button class="btn secondary" style="margin-top: 1rem;" onclick="window.library.renderHome()">
                        <i class="ph ph-arrow-left"></i> Back to Home
                    </button>
                </div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        resources.forEach(resource => {
            fragment.appendChild(this._createResourceCard(resource));
        });
        this.elements.list.appendChild(fragment);
        
        this._enableKeyboardNavigation();
    },
    
    _enableKeyboardNavigation() {
        const cards = this.elements.list.querySelectorAll('.resource-card, .category-card');
        if (cards.length === 0) return;
        
        cards.forEach((card, index) => {
            card.addEventListener('keydown', (e) => {
                let targetIndex = index;
                const cols = getComputedStyle(this.elements.list).gridTemplateColumns?.split(' ').length || 3;
                
                switch(e.key) {
                    case 'ArrowRight':
                        e.preventDefault();
                        targetIndex = Math.min(index + 1, cards.length - 1);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        targetIndex = Math.max(index - 1, 0);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        targetIndex = Math.min(index + cols, cards.length - 1);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        targetIndex = Math.max(index - cols, 0);
                        break;
                    default:
                        return;
                }
                
                cards[targetIndex]?.focus();
            });
        });
    },

    _getIconForType(type) {
        const map = {
            video: 'video',
            audio: 'music-note',
            pdf: 'file-pdf',
            image: 'image',
            archive: 'file-archive',
            text: 'file-text',
            document: 'file-doc'
        };
        return `<i class="ph ph-${map[type] || 'file'}"></i>`;
    },

    /* === UPLOAD LOGIC === */

    _bindUpload() {
        this.elements.fileInput = document.createElement('input');
        this.elements.fileInput.type = 'file';
        this.elements.fileInput.style.display = 'none';
        document.body.appendChild(this.elements.fileInput);

        this.elements.fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const pin = await this.requestPin();
                if (!pin) {
                    this.elements.fileInput.value = '';
                    return;
                }

                const progressModal = this._createProgressModal(file.name, file.size);
                document.body.appendChild(progressModal);

                const progressCallback = (percent, uploaded, total) => {
                    const progressBar = progressModal.querySelector('.upload-progress-fill');
                    const progressText = progressModal.querySelector('.upload-progress-text');
                    const progressBytes = progressModal.querySelector('.upload-progress-bytes');
                    
                    if (progressBar) progressBar.style.width = `${percent}%`;
                    if (progressText) progressText.textContent = `${percent}%`;
                    if (progressBytes) {
                        const uploadedMB = (uploaded / (1024 * 1024)).toFixed(2);
                        const totalMB = (total / (1024 * 1024)).toFixed(2);
                        progressBytes.textContent = `${uploadedMB} MB / ${totalMB} MB`;
                    }
                };

                const INSTANT_THRESHOLD = 5 * 1024 * 1024;
                if (file.size <= INSTANT_THRESHOLD) {
                    let currentProgress = 0;
                    const animateInterval = setInterval(() => {
                        currentProgress += 10;
                        if (currentProgress <= 90) {
                            progressCallback(currentProgress, file.size * currentProgress / 100, file.size);
                        } else {
                            clearInterval(animateInterval);
                        }
                    }, 40);
                }

                await store.uploadResource(file, pin, progressCallback);
                
                this._showUploadSuccess(progressModal, file.name, file.size);
                
                this.renderHome();
            } catch (err) {
                const progressModal = document.querySelector('.upload-progress-modal');
                if (progressModal) progressModal.remove();
                
                if (err !== 'cancelled') {
                    console.error(err);
                    common.showToast('Upload failed: ' + err.message, 'error');
                }
            }
            this.elements.fileInput.value = '';
        });
    },

    _createProgressModal(filename, fileSize) {
        const modal = document.createElement('div');
        modal.className = 'modal upload-progress-modal';
        modal.style.display = 'flex';
        
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        
        modal.innerHTML = `
            <div class="modal-content upload-widget" data-state="uploading">
                <div class="upload-header">
                    <h3>Uploading File</h3>
                    <div class="upload-controls">
                        <button class="btn-minimize" title="Minimize">
                            <i class="ph ph-minus"></i>
                        </button>
                    </div>
                </div>
                <div class="upload-body">
                    <p class="upload-filename">${this._escapeHtml(filename)}</p>
                    <div class="upload-progress-container">
                        <div class="upload-progress-bar">
                            <div class="upload-progress-fill"></div>
                        </div>
                        <div class="upload-progress-info">
                            <span class="upload-progress-text">0%</span>
                            <span class="upload-progress-bytes">0 MB / ${sizeMB} MB</span>
                        </div>
                    </div>
                    <p class="upload-hint">
                        Please wait while your file is being uploaded...
                    </p>
                </div>
            </div>
        `;
        
        const minimizeBtn = modal.querySelector('.btn-minimize');
        const widget = modal.querySelector('.upload-widget');
        
        minimizeBtn.addEventListener('click', () => {
            if (modal.classList.contains('minimized')) {
                modal.classList.remove('minimized');
                minimizeBtn.innerHTML = '<i class="ph ph-minus"></i>';
                minimizeBtn.title = 'Minimize';
            } else {
                modal.classList.add('minimized');
                minimizeBtn.innerHTML = '<i class="ph ph-arrows-out-simple"></i>';
                minimizeBtn.title = 'Expand';
            }
        });
        
        widget.addEventListener('click', (e) => {
            if (modal.classList.contains('minimized') && !e.target.closest('.upload-controls')) {
                minimizeBtn.click();
            }
        });
        
        return modal;
    },

    _showUploadSuccess(modal, filename, fileSize) {
        const widget = modal.querySelector('.upload-widget');
        const header = modal.querySelector('.upload-header h3');
        const controls = modal.querySelector('.upload-controls');
        const body = modal.querySelector('.upload-body');
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        
        widget.setAttribute('data-state', 'success');
        header.textContent = 'Upload Complete!';
        
        controls.innerHTML = `
            <button class="btn-close" title="Close">
                <i class="ph ph-x"></i>
            </button>
        `;
        
        body.innerHTML = `
            <div class="upload-success-icon">
                <i class="ph ph-check-circle"></i>
            </div>
            <p class="upload-filename">${this._escapeHtml(filename)}</p>
            <p class="upload-success-size">${sizeMB} MB uploaded successfully</p>
        `;
        
        const closeBtn = controls.querySelector('.btn-close');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        setTimeout(() => {
            if (modal && !modal.classList.contains('minimized')) {
                modal.classList.add('minimized');
            }
        }, 2000);
        
        setTimeout(() => {
            modal.remove();
        }, 5000);
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /* === Phase 3: Error Boundaries === */
    
    _renderErrorState(context, message) {
        if (!this.elements.list) return;
        
        this.elements.list.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-boundary-state';
        errorDiv.innerHTML = `
            <div class="error-icon">
                <i class="ph ph-warning-circle"></i>
            </div>
            <h3>Something went wrong</h3>
            <p>${this._escapeHtml(message)}</p>
            <button class="btn primary" onclick="location.reload()">
                <i class="ph ph-arrow-clockwise"></i> Reload Page
            </button>
        `;
        this.elements.list.appendChild(errorDiv);
    },

    requestPin() {
        return new Promise((resolve, reject) => {
            const modal = document.getElementById('pin-modal');
            const form = document.getElementById('pin-form');
            const input = document.getElementById('upload-pin-input');
            const confirmBtn = document.getElementById('btn-pin-confirm');
            const cancelBtn = document.getElementById('btn-pin-cancel');

            if (!modal || !input || !form) return reject(new Error('Modal missing'));

            input.value = '';
            modal.classList.remove('hidden');
            input.focus();

            const close = () => {
                modal.classList.add('hidden');
                form.onsubmit = null;
                cancelBtn.onclick = null;
                input.onkeydown = null;
            };

            const submit = (e) => {
                if (e) e.preventDefault();
                const val = input.value;
                if (val) {
                    close();
                    resolve(val);
                }
            };

            form.onsubmit = submit;
            
            cancelBtn.onclick = () => {
                close();
                reject('cancelled');
            };

            input.onkeydown = (e) => {
                if (e.key === 'Escape') {
                    close();
                    reject('cancelled');
                }
            };
        });
    },

    triggerUploadFlow() {
        if (this.elements.fileInput) {
            this.elements.fileInput.click();
        }
    },

    /* === EVENT BINDINGS === */

    _bindSearch() {
        if (!this.elements.searchInput) return;
        let timeout;
        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const query = e.target.value.trim();
            
            timeout = setTimeout(async () => {
                if (query === '') {
                    this.renderHome();
                } else {
                    const results = await store.search(query);
                    this._renderBreadcrumbs('Search Results');
                    this.renderList(results);
                }
            }, 300);
        });
    },

    _bindViewToggles() {
        if (this.elements.btnGrid) {
            this.elements.btnGrid.addEventListener('click', () => {
                this.elements.list.classList.remove('list-view');
                this.elements.btnGrid.classList.add('active');
                this.elements.btnList.classList.remove('active');
                store.updateSetting('layout', 'grid');
            });
        }
        if (this.elements.btnList) {
            this.elements.btnList.addEventListener('click', () => {
                this.elements.list.classList.add('list-view');
                this.elements.btnList.classList.add('active');
                this.elements.btnGrid.classList.remove('active');
                store.updateSetting('layout', 'list');
            });
        }
    },

    _bindCacheClear() {
        if (this.elements.btnClearCache) {
            this.elements.btnClearCache.addEventListener('click', () => {
                common.showConfirmationDialog(
                    'Delete all downloaded resources?',
                    async () => {
                        try {
                            const originalIcon = this.elements.btnClearCache.innerHTML;
                            this.elements.btnClearCache.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

                            await caches.delete('techbros-resources-v1');
                            localStorage.removeItem('techbros_settings');
                            common.showToast('Cache cleared. Reloading...', 'success');
                            setTimeout(() => location.reload(), 1500);
                        } catch (error) {
                            common.showToast('Error clearing cache', 'error');
                            this.elements.btnClearCache.innerHTML = '<i class="ph ph-trash"></i>';
                        }
                    }
                );
            });
        }
    }
};