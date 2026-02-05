/* === SECURITY UTILITIES === */

export const security = {
    
    /* === HTML SANITIZATION === */    sanitizeHTML(input) {
        if (typeof input !== 'string') return '';
        
        const temp = document.createElement('div');
        temp.textContent = input;
        return temp.innerHTML;
    },    sanitizeText(text) {
        if (typeof text !== 'string') return '';
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },
    
    /* === FILE NAME SANITIZATION === */    sanitizeFileName(fileName) {
        if (typeof fileName !== 'string') return 'untitled';
        
        return fileName
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/^\.+/, '')
            .replace(/\.+$/, '')
            .replace(/\s+/g, '_')
            .substring(0, 255)
            .toLowerCase()
            || 'untitled';
    },    isValidFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') return false;
        
        const dangerous = /[<>:"/\\|?*\x00-\x1f]/;
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        
        if (dangerous.test(fileName)) return false;
        if (fileName.length > 255) return false;
        if (fileName.startsWith('.')) return false;
        if (reservedNames.includes(fileName.toUpperCase())) return false;
        
        return true;
    },
    
    /* === URL SANITIZATION === */    sanitizeURL(url) {
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
    
    /* === DOM MANIPULATION HELPERS === */    safeSetText(element, text) {
        if (!element || !element.textContent !== undefined) return;
        element.textContent = this.sanitizeText(text);
    },    safeSetHTML(element, html) {
        if (!element || !element.innerHTML !== undefined) return;
        element.innerHTML = this.sanitizeHTML(html);
    },    createSafeTextNode(text) {
        return document.createTextNode(this.sanitizeText(text));
    },
    
    /* === INPUT VALIDATION === */    isValidPIN(pin) {
        if (typeof pin !== 'string') return false;
        return /^\d{4}$/.test(pin);
    },    isValidSearchQuery(query) {
        if (typeof query !== 'string') return false;
        if (query.length > 100) return false;
        
        const dangerous = /<script|javascript:|on\w+=/i;
        return !dangerous.test(query);
    },    sanitizeSearchQuery(query) {
        if (!this.isValidSearchQuery(query)) return '';
        return query.trim().substring(0, 100);
    }
};