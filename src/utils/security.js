/* === SECURITY UTILITIES === */

export const security = {
    
    /* === HTML SANITIZATION === */
    
    /**
     * Sanitizes HTML content to prevent XSS attacks
     * @param {string} input - Raw HTML string
     * @returns {string} Sanitized HTML string
     */
    sanitizeHTML(input) {
        if (typeof input !== 'string') return '';
        
        const temp = document.createElement('div');
        temp.textContent = input;
        return temp.innerHTML;
    },
    
    /**
     * Sanitizes text content for safe display
     * @param {string} text - Raw text
     * @returns {string} Sanitized text
     */
    sanitizeText(text) {
        if (typeof text !== 'string') return '';
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },
    
    /* === FILE NAME SANITIZATION === */
    
    /**
     * Sanitizes file names to prevent path traversal and injection
     * @param {string} fileName - Original file name
     * @returns {string} Sanitized file name
     */
    sanitizeFileName(fileName) {
        if (typeof fileName !== 'string') return 'untitled';
        
        return fileName
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/^\.+/, '')
            .replace(/\.+$/, '')
            .replace(/\s+/g, '_')
            .substring(0, 255)
            .toLowerCase()
            || 'untitled';
    },
    
    /**
     * Validates file name for upload safety
     * @param {string} fileName - File name to validate
     * @returns {boolean} Whether file name is safe
     */
    isValidFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') return false;
        
        const dangerous = /[<>:"/\\|?*\x00-\x1f]/;
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        
        if (dangerous.test(fileName)) return false;
        if (fileName.length > 255) return false;
        if (fileName.startsWith('.')) return false;
        if (reservedNames.includes(fileName.toUpperCase())) return false;
        
        return true;
    },
    
    /* === URL SANITIZATION === */
    
    /**
     * Validates and sanitizes URLs to prevent open redirect attacks
     * @param {string} url - URL to sanitize
     * @returns {string|null} Sanitized URL or null if invalid
     */
    sanitizeURL(url) {
        if (typeof url !== 'string') return null;
        
        try {
            const parsed = new URL(url);
            
            const allowedProtocols = ['http:', 'https:', 'blob:', 'data:'];
            if (!allowedProtocols.includes(parsed.protocol)) {
                return null;
            }
            
            return parsed.toString();
        } catch (e) {
            return null;
        }
    },
    
    /* === DOM MANIPULATION HELPERS === */
    
    /**
     * Safely sets text content on an element
     * @param {Element} element - DOM element
     * @param {string} text - Text to set
     */
    safeSetText(element, text) {
        if (!element || !element.textContent !== undefined) return;
        element.textContent = this.sanitizeText(text);
    },
    
    /**
     * Safely sets HTML content on an element (with sanitization)
     * @param {Element} element - DOM element  
     * @param {string} html - HTML to set
     */
    safeSetHTML(element, html) {
        if (!element || !element.innerHTML !== undefined) return;
        element.innerHTML = this.sanitizeHTML(html);
    },
    
    /**
     * Creates a safe text node
     * @param {string} text - Text content
     * @returns {Text} Text node
     */
    createSafeTextNode(text) {
        return document.createTextNode(this.sanitizeText(text));
    },
    
    /* === INPUT VALIDATION === */
    
    /**
     * Validates PIN format for P2P connections
     * @param {string} pin - PIN to validate
     * @returns {boolean} Whether PIN is valid
     */
    isValidPIN(pin) {
        if (typeof pin !== 'string') return false;
        return /^\d{4}$/.test(pin);
    },
    
    /**
     * Validates search query to prevent injection
     * @param {string} query - Search query
     * @returns {boolean} Whether query is safe
     */
    isValidSearchQuery(query) {
        if (typeof query !== 'string') return false;
        if (query.length > 100) return false;
        
        const dangerous = /<script|javascript:|on\w+=/i;
        return !dangerous.test(query);
    },
    
    /**
     * Sanitizes search query for safe processing
     * @param {string} query - Raw search query
     * @returns {string} Sanitized query
     */
    sanitizeSearchQuery(query) {
        if (!this.isValidSearchQuery(query)) return '';
        return query.trim().substring(0, 100);
    }
};