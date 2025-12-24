import './js/store.js';
import './js/ui.js';
import './js/p2p.js';

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize store first
        await store.init();
        
        // Initialize P2P
        await p2p.init();
        
        // Initialize UI last (depends on store and p2p)
        ui.init();
        
        console.log('[App] All modules initialized successfully');
    } catch (error) {
        console.error('[App] Initialization failed:', error);
    }
});