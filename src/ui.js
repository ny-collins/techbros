import { store } from './store.js';
import { common } from './ui/common.js';
import { router } from './ui/router.js';
import { library } from './ui/library.js';
import { viewer } from './ui/viewer.js';

/* === DYNAMIC IMPORTS === */

let p2p = null;
let p2pUI = null;

class UIManager {
    constructor() {
        this.modules = {
            common,
            router,
            library,
            viewer
        };
        this.p2pLoaded = false;
    }

    /* === DYNAMIC LOADING === */

    async loadP2PModules() {
        if (this.p2pLoaded) return { p2p, p2pUI };
        
        try {
            const [p2pModule, p2pUIModule] = await Promise.all([
                import('./p2p.js'),
                import('./ui/p2p-ui.js')
            ]);
            
            p2p = p2pModule.p2p;
            p2pUI = p2pUIModule.p2pUI;
            this.modules.p2pUI = p2pUI;
            this.p2pLoaded = true;
            
            return { p2p, p2pUI };
        } catch (error) {
            console.error('[UI] Failed to load P2P modules:', error);
            throw error;
        }
    }

    /* === INITIALIZATION === */

    init() {
        common.init();
        viewer.init(router);
        library.init(router, viewer);

        router.init((viewId) => {
            if (viewId === 'library') {
                library.reset(router, viewer);
            } else if (viewId === 'p2p') {
                this._initP2PView();
            }
        });

        router.setGuard((currentView, nextView) => {
            if (currentView === 'p2p' && p2pUI && p2pUI.hasActiveTransfers()) {
                return new Promise((resolve) => {
                    common.showConfirmationDialog(
                        'Transfers are in progress. Leaving this page might interrupt them. Continue?',
                        () => resolve(true),
                        () => resolve(false)
                    );
                });
            }
            return true;
        });

        this._checkInstallation();
    }

    async _initP2PView() {
        if (this.p2pLoaded) return;
        
        try {
            const loadingToast = common.showToast('Loading P2P module...', 'info', 0);
            
            const { p2p: p2pModule, p2pUI: p2pUIModule } = await this.loadP2PModules();
            
            p2pUIModule.init();
            await p2pModule.init();
            
            if (loadingToast) loadingToast.remove();
            common.showToast('P2P ready!', 'success');
        } catch (error) {
            common.showToast('Failed to load P2P features', 'error');
            router.navigateTo('library');
        }
    }

    /* === PWA INSTALLATION === */

    async _checkInstallation() {
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

        if ('getInstalledRelatedApps' in navigator) {
            try {
                const relatedApps = await navigator.getInstalledRelatedApps();
                if (relatedApps.length > 0) {
                    showInstalledState();
                    return;
                }
            } catch (error) {
                console.warn('[UI] getInstalledRelatedApps failed:', error);
            }
        }

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
                    common.showToast('To install: Tap browser menu > Add to Home Screen', 'info');
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
            common.showToast('App installed successfully!', 'success');
        });
    }
}

export const ui = new UIManager();
