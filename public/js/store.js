/**
 * TechBros Store (v2.0)
 * Manages application state, resources, and settings.
 * acts as the Single Source of Truth (SSOT).
 */

class Store {
    constructor() {
        this.state = {
            resources: [],
            settings: {
                theme: 'dark', // Default preference
                layout: 'grid',
                lastSeen: Date.now()
            },
            user: {
                peerId: null,
                pin: null
            }
        };

        // Event listeners could be implemented here (Observer pattern)
        // for now, we keep it simple.
    }

    /**
     * Initialize the store: Load settings and fetch resources.
     */
    async init() {
        this._loadSettings();
        await this._fetchResources();
        console.log('[Store] Initialized with', this.state.resources.length, 'resources.');
    }

    /**
     * Fetches the resources.json database.
     */
    async _fetchResources() {
        try {
            const response = await fetch('/resources.json');
            if (!response.ok) throw new Error('Failed to load resources');
            
            const data = await response.json();
            
            // Basic Validation: Ensure it's an array
            if (!Array.isArray(data)) {
                console.error('[Store] resources.json is not an array!');
                this.state.resources = [];
                return;
            }

            this.state.resources = data;
        } catch (error) {
            console.error('[Store] Error fetching resources:', error);
            // In offline mode, this might fail if not cached. 
            // The Service Worker should handle the caching, but we handle the error state here.
            this.state.resources = [];
        }
    }

    /**
     * Load settings from LocalStorage
     */
    _loadSettings() {
        const saved = localStorage.getItem('techbros_settings');
        if (saved) {
            try {
                this.state.settings = { ...this.state.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.warn('[Store] Corrupt settings cleared.');
                localStorage.removeItem('techbros_settings');
            }
        }
    }

    /**
     * Save current settings to LocalStorage
     */
    _saveSettings() {
        localStorage.setItem('techbros_settings', JSON.stringify(this.state.settings));
    }

    // --- Public API ---

    getResources() {
        return this.state.resources;
    }

    /**
     * Search resources by query string
     * @param {string} query 
     */
    search(query) {
        if (!query) return this.state.resources;
        const lowerQ = query.toLowerCase();
        return this.state.resources.filter(item => 
            item.title.toLowerCase().includes(lowerQ) ||
            (item.description && item.description.toLowerCase().includes(lowerQ))
        );
    }

    getSettings() {
        return this.state.settings;
    }

    updateSetting(key, value) {
        if (key in this.state.settings) {
            this.state.settings[key] = value;
            this._saveSettings();
        }
    }

    setUserPeerId(id, pin) {
        this.state.user.peerId = id;
        this.state.user.pin = pin;
    }
}

// Export a singleton instance
export const store = new Store();