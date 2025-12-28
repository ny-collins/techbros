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
    },
    activeFilter: 'all',

    init(router, viewer) {
        this._bindSearch();
        this._bindViewToggles();
        this._bindCacheClear();

        const resources = store.getResources();
        this.renderFilters(resources);
        this.renderList(resources, viewer, router);
    },

    reset(router, viewer) {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        this.activeFilter = 'all';
        if (this.elements.filterContainer) {
            this.elements.filterContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            const allBtn = this.elements.filterContainer.querySelector('[data-filter="all"]');
            if (allBtn) allBtn.classList.add('active');
        }
        this.renderList(store.getResources(), viewer, router);
    },

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
                    this.renderList(store.getResources());
                } else {
                    const filtered = store.getResources().filter(r => r.type === type);
                    this.renderList(filtered);
                }
            });
            
            this.elements.filterContainer.appendChild(btn);
        });
    },

    renderList(resources, viewer = null, router = null) {
        if (viewer) this.viewer = viewer;
        if (router) this.router = router;

        if (!this.elements.list) return;

        this.elements.list.innerHTML = '';
        const fragment = document.createDocumentFragment();

        if (resources.length === 0) {
            this.elements.list.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align:center; padding: 4rem; color: var(--text-muted);">
                    <i class="ph ph-ghost" style="font-size: 64px; margin-bottom: 1rem; opacity: 0.8;"></i>
                    <p style="color: var(--text-main); font-weight: 500;">No resources found.</p>
                </div>`;
            return;
        }

        resources.forEach(resource => {
            const card = this._createResourceCard(resource);
            fragment.appendChild(card);
        });
        this.elements.list.appendChild(fragment);
    },

    _createResourceCard(data) {
        const div = document.createElement('div');
        div.className = 'resource-card';
        div.setAttribute('tabindex', '0');
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', `Open ${common.sanitizeText(data.title)}`);

        div.addEventListener('click', () => {
            if (this.viewer && this.router) this.viewer.open(data, this.router);
        });
        
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (this.viewer && this.router) this.viewer.open(data, this.router);
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
        title.textContent = common.sanitizeText(data.title);

        const meta = document.createElement('div');
        meta.className = 'meta';
        
        const typeSpan = document.createElement('span');
        typeSpan.textContent = data.type.toUpperCase();
        
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

    _getIconForType(type) {
        const map = { video: 'video', audio: 'music-note', pdf: 'file-pdf' };
        return `<i class="ph ph-${map[type] || 'file'}"></i>`;
    },

    _bindSearch() {
        if (!this.elements.searchInput) return;
        let timeout;
        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const results = await store.search(e.target.value);
                this.renderList(results);
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