import { store } from './store.js';
import { ui } from './ui.js';
import { p2p } from './p2p.js';
import './style.css';

document.addEventListener('DOMContentLoaded', async () => {
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
});