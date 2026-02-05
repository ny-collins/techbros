import { store } from './store.js';
import { ui } from './ui.js';
import { SnowSystem } from './ui/snow.js';

/* === SPLASH SCREEN MANAGER === */

const splashScreen = {
    elements: {
        screen: document.getElementById('splash-screen'),
        progress: document.getElementById('splash-progress'),
        status: document.getElementById('splash-status'),
        error: document.getElementById('splash-error'),
        skip: document.getElementById('splash-skip')
    },
    startTime: Date.now(),
    minDisplayTime: 1500,
    isSkipped: false,

    updateProgress(percent, status) {
        if (this.elements.progress) {
            this.elements.progress.style.width = `${percent}%`;
        }
        if (this.elements.status) {
            this.elements.status.textContent = status;
        }
    },

    showError() {
        if (this.elements.error) {
            this.elements.error.classList.remove('hidden');
        }
        if (this.elements.status) {
            this.elements.status.style.display = 'none';
        }
    },

    hide() {
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.minDisplayTime - elapsed);

        setTimeout(() => {
            if (this.elements.screen) {
                this.elements.screen.classList.add('hidden');
            }
        }, this.isSkipped ? 0 : remaining);
    },

    setupSkip() {
        const skip = () => {
            this.isSkipped = true;
            this.hide();
        };

        if (this.elements.skip) {
            this.elements.skip.addEventListener('click', skip);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.screen && !this.elements.screen.classList.contains('hidden')) {
                skip();
            }
        });

        this.elements.screen.addEventListener('click', (e) => {
            if (e.target === this.elements.screen) {
                skip();
            }
        });
    }
};

/* === BOOTSTRAP === */

const bootApp = async () => {
    splashScreen.setupSkip();
    splashScreen.updateProgress(10, 'Loading application...');

    let hasError = false;

    try {
        splashScreen.updateProgress(30, 'Initializing storage...');
        await store.init();
        splashScreen.updateProgress(60, 'Setting up interface...');
    } catch (error) {
        console.error('[App] Store initialization failed:', error);
        hasError = true;
    }

    try {
        ui.init();
        splashScreen.updateProgress(80, 'Almost ready...');
    } catch (error) {
        console.error('[App] UI initialization failed:', error);
        hasError = true;
    }

    if (hasError) {
        splashScreen.showError();
        return;
    }

    try {
        const today = new Date();
        if (today.getMonth() === 11) {
            const snow = new SnowSystem();
            snow.init();
            window.snowSystem = snow;
        }
    } catch (error) {
        console.error('[App] Snow system initialization failed:', error);
    }

    /* === SERVICE WORKER === */

    if ('serviceWorker' in navigator) {
        const registerSW = async () => {
            try {
                await navigator.serviceWorker.register('/sw.js');
            } catch (error) {
                console.error('[App] Service Worker registration failed:', error);
            }
        };

        if (document.readyState === 'complete') {
            registerSW();
        } else {
            window.addEventListener('load', registerSW);
        }
    }

    splashScreen.updateProgress(100, 'Ready!');
    await new Promise(resolve => setTimeout(resolve, 300));
    splashScreen.hide();
};

bootApp();
