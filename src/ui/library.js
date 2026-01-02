import { store } from '../store.js';
import { common } from './common.js';

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
    currentFolder: null, // null means "Home" (Dashboard)

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
        this.currentFolder = null;
        if (!this.elements.list) return;

        this._toggleViewControls(false);

        this.elements.filterContainer.innerHTML = '';
        this.elements.list.innerHTML = '';
        this.elements.list.className = ''; 

        // 1. Pinned Section
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

        // 2. Categories Section
        const resources = store.getResources();
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

        const home = document.createElement('span');
        home.className = 'breadcrumb-item';
        home.innerHTML = '<i class="ph ph-house"></i> Home';
        home.onclick = () => this.renderHome();

        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.innerHTML = '<i class="ph ph-caret-right"></i>';

        const currentName = folderName.charAt(0).toUpperCase() + folderName.slice(1);
        const current = document.createElement('span');
        current.className = 'breadcrumb-item active';
        current.textContent = currentName === 'Pdf' ? 'Documents' : currentName;

        nav.appendChild(home);
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

        if (data.isCloud) {
            const cloudBadge = document.createElement('span');
            cloudBadge.className = 'badge-cloud';
            cloudBadge.innerHTML = '<i class="ph ph-cloud"></i>';
            cloudBadge.style.position = 'absolute';
            cloudBadge.style.top = '10px';
            cloudBadge.style.right = '40px';
            cloudBadge.style.color = 'var(--accent-color)';
            div.appendChild(cloudBadge);
        }

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
        typeSpan.textContent = typeName === 'PDF' ? 'DOCUMENT' : typeName;

        const sizeSpan = document.createElement('span');
        sizeSpan.textContent = common.formatBytes(data.size || 0);

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
        
        if (cat.id === 'upload') {
            div.classList.add('special-action');
            div.onclick = () => this.triggerUploadFlow();
        } else {
            div.onclick = () => this.renderFolder(cat.id);
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
                    <p style="color: var(--text-main); font-weight: 500;">No resources found.</p>
                </div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        resources.forEach(resource => {
            fragment.appendChild(this._createResourceCard(resource));
        });
        this.elements.list.appendChild(fragment);
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

                common.showToast(`Uploading ${file.name}...`, 'info');
                await store.uploadResource(file, pin);
                common.showToast('Upload successful!', 'success');
                this.renderHome(); // Refresh dashboard stats
            } catch (err) {
                if (err !== 'cancelled') {
                    console.error(err);
                    common.showToast('Upload failed: ' + err.message, 'error');
                }
            }
            this.elements.fileInput.value = '';
        });
    },

    requestPin() {
        return new Promise((resolve, reject) => {
            const modal = document.getElementById('pin-modal');
            const input = document.getElementById('upload-pin-input');
            const confirmBtn = document.getElementById('btn-pin-confirm');
            const cancelBtn = document.getElementById('btn-pin-cancel');

            if (!modal || !input) return reject(new Error('Modal missing'));

            input.value = '';
            modal.classList.remove('hidden');
            input.focus();

            const close = () => {
                modal.classList.add('hidden');
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
                input.onkeydown = null;
            };

            const submit = () => {
                const val = input.value;
                if (val) {
                    close();
                    resolve(val);
                }
            };

            confirmBtn.onclick = submit;
            
            cancelBtn.onclick = () => {
                close();
                reject('cancelled');
            };

            input.onkeydown = (e) => {
                if (e.key === 'Enter') submit();
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