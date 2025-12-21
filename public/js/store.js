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
     * Search resources using Fuzzy Search (Levenshtein Distance)
     * @param {string} query 
     */
    search(query) {
        if (!query) return this.state.resources;
        const lowerQ = query.toLowerCase();
        
        // Configuration
        const MAX_DISTANCE = 3; // Maximum allowed typos

        return this.state.resources.filter(item => {
            const title = item.title.toLowerCase();
            
            // 1. Direct Substring Match (Fastest & Most Common)
            if (title.includes(lowerQ)) return true;
            if (item.description && item.description.toLowerCase().includes(lowerQ)) return true;

            // 2. Fuzzy Match (Typo Tolerance)
            // We only check if the query is at least 3 chars long to avoid noise
            if (lowerQ.length > 2) {
                // Check Levenshtein distance against the Title
                // Optimization: We check against individual words in the title too? 
                // For now, let's check against the whole title string truncated to query length
                // or just the whole title if it's short.
                
                const dist = this._levenshtein(lowerQ, title);
                
                // We normalize: if distance is small relative to length
                if (dist <= MAX_DISTANCE) return true;
            }

            return false;
        });
    }

    /**
     * Levenshtein Distance Algorithm
     * Calculates the minimum number of single-character edits to change a into b.
     */
    _levenshtein(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        // Increment along the first column of each row
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        // Increment each column in the first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1  // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
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