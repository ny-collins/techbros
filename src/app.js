import { store } from './store.js';
import { ui } from './ui.js';
import { SnowSystem } from './ui/snow.js';

/* === BOOTSTRAP === */

const bootApp = async () => {
    try {
        await store.init();
    } catch (error) {
        console.error('[App] Store initialization failed:', error);
    }

    try {
        ui.init();
    } catch (error) {
        console.error('[App] UI initialization failed:', error);
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
};

bootApp();
