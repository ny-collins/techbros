import { common } from './common.js';

export const router = {
    elements: {
        navLinks: document.querySelectorAll('.nav-link'),
        views: document.querySelectorAll('.view-section'),
        topBar: document.getElementById('main-header'),
    },
    currentView: 'library',

    init(onViewChange) {
        this.onViewChange = onViewChange || (() => {});

        if (this.elements.navLinks) {
            this.elements.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = link.getAttribute('href').substring(1);
                    this.navigateTo(target);
                });
            });
        }

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
    },

    navigateTo(viewId, addToHistory = true) {
        if (this.elements.views) this.elements.views.forEach(el => el.classList.remove('active'));
        
        const target = document.getElementById(`${viewId}-view`);
        
        if (viewId === 'resource') {
            if (this.elements.topBar) this.elements.topBar.classList.add('hidden');
        } else {
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

            if (window.innerWidth <= 768) common.closeSidebar();

            this.onViewChange(viewId);
        }
    }
};