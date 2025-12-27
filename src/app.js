import { store } from './store.js';
import { ui } from './ui.js';
import { p2p } from './p2p.js';

const bootApp = async () => {
    try {
        await store.init();
    } catch (error) {
        console.error('[App] Store initialization failed:', error);
    }

    try {
        await p2p.init();
    } catch (error) {
        console.error('[App] P2P initialization failed:', error);
    }

    try {
        ui.init();
    } catch (error) {
        console.error('[App] UI initialization failed:', error);
    }

    console.log('[App] Boot sequence complete');

    if ('serviceWorker' in navigator) {
        const registerSW = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('[App] Service Worker registered with scope:', registration.scope);
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