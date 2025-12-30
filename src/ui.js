import { store } from './store.js';
import { p2p } from './p2p.js';
import { common } from './ui/common.js';
import { router } from './ui/router.js';
import { library } from './ui/library.js';
import { viewer } from './ui/viewer.js';
import { p2pUI } from './ui/p2p-ui.js';

class UIManager {
    constructor() {
        this.modules = {
            common,
            router,
            library,
            viewer,
            p2pUI
        };
    }

    /* === INITIALIZATION === */

    init() {
        common.init();

        p2pUI.init();
        viewer.init(router);

        library.init(router, viewer);

        router.init((viewId) => {
            if (viewId === 'library') {
                library.reset(router, viewer);
            }
        });

        p2p.init().catch(console.error);

        this._checkInstallation();
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