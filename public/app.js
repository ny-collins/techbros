/**
 * TechBros Main Application Entry Point (v2.0)
 * Orchestrates module initialization and Service Worker registration.
 * Acts as the centralized "Conductor".
 */

import { store } from './js/store.js';
import { p2p } from './js/p2p.js';
import { ui } from './js/ui.js';

// Global Error Handler for unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
    console.warn('[App] Unhandled Rejection:', event.reason);
});

async function initApp() {
    console.log('[App] Booting TechBros v2.0.0...');

    try {
        // 1. Initialize State (Load settings, fetch resources)
        // This is critical for content to appear.
        await store.init();

        // 2. Initialize UI (Render library, bind events)
        // Must happen after store is ready so we have data to render.
        ui.init();

        // 3. Initialize P2P (Signaling connection)
        // We initialize this non-blockingly so the user can browse immediately.
        // If offline, this might fail, but the app remains usable.
        p2p.init().then(() => {
            console.log('[App] P2P Network Ready');
        }).catch(err => {
            console.warn('[App] P2P Initialization failed (Offline?):', err);
            ui.updateStatus('Offline Mode', 'neutral');
        });

    } catch (err) {
        console.error('[App] Critical Initialization Error:', err);
        // Ideally we would show a "Fatal Error" UI here if the Store fails completely
        document.body.innerHTML = `<h1>Fatal Error</h1><p>${err.message}</p>`;
    }
}

// --- Service Worker Registration ---
// Essential for the "Offline-First" capability
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('[SW] Service Worker registered with scope:', registration.scope);
                
                // Optional: Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            ui.showToast('New update available! Reload to apply.', 'info');
                        }
                    });
                });
            })
            .catch(err => {
                console.error('[SW] Registration failed:', err);
            });
    });
}

// Start the engine
// Note: We use 'DOMContentLoaded' to ensure the HTML shell is parsed.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}