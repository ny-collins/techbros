// public/utils.js - Utility Functions

// ==========================================
// SECURITY UTILITIES
// ==========================================

/**
 * Sanitizes HTML string to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string safe for innerHTML
 */
export function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * Creates a text node safely without XSS risk
 * @param {string} text - The text content
 * @returns {Text} Text node
 */
export function createSafeText(text) {
    return document.createTextNode(text);
}

/**
 * Validates file type and size for P2P transfers
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateFile(file) {
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
    const ALLOWED_TYPES = [
        'application/pdf',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip', 'text/plain'
    ];

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size exceeds 500MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`
        };
    }

    // Check file type
    const fileExt = file.name.split('.').pop().toLowerCase();
    const dangerousExts = ['exe', 'bat', 'sh', 'cmd', 'com', 'msi', 'scr', 'vbs', 'js', 'jar'];
    
    if (dangerousExts.includes(fileExt)) {
        return {
            valid: false,
            error: `File type .${fileExt} is not allowed for security reasons`
        };
    }

    // Optionally check MIME type (can be spoofed but adds another layer)
    if (file.type && !ALLOWED_TYPES.some(type => file.type.startsWith(type.split('/')[0]))) {
        console.warn('File MIME type not in whitelist:', file.type);
    }

    return { valid: true, error: null };
}

// ==========================================
// SEARCH UTILITIES (Fuzzy Search)
// ==========================================

/**
 * Calculates Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}

/**
 * Performs fuzzy search on a string
 * @param {string} query - Search query
 * @param {string} target - Target string to search in
 * @returns {number} Similarity score (0-1, higher is better)
 */
export function fuzzyMatch(query, target) {
    query = query.toLowerCase();
    target = target.toLowerCase();
    
    // Exact match
    if (target.includes(query)) return 1.0;
    
    // Calculate similarity based on Levenshtein distance
    const maxLength = Math.max(query.length, target.length);
    const distance = levenshteinDistance(query, target);
    const similarity = 1 - (distance / maxLength);
    
    // Bonus for matching start of words
    const words = target.split(/\s+/);
    const startsWithBonus = words.some(word => word.startsWith(query)) ? 0.2 : 0;
    
    return Math.min(similarity + startsWithBonus, 1.0);
}

/**
 * Filters and sorts items by relevance using fuzzy search
 * @param {Array} items - Items to search
 * @param {string} query - Search query
 * @param {Array<string>} fields - Fields to search in
 * @param {number} threshold - Minimum score threshold (0-1)
 * @returns {Array} Sorted and filtered items
 */
export function fuzzySearch(items, query, fields = ['title', 'category', 'description'], threshold = 0.3) {
    if (!query || query.trim() === '') return items;
    
    const results = items.map(item => {
        let maxScore = 0;
        
        for (const field of fields) {
            if (item[field]) {
                const score = fuzzyMatch(query, item[field]);
                maxScore = Math.max(maxScore, score);
            }
        }
        
        return { item, score: maxScore };
    });
    
    return results
        .filter(result => result.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .map(result => result.item);
}

// ==========================================
// FORMAT UTILITIES
// ==========================================

/**
 * Formats bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return d.toLocaleDateString();
}

/**
 * Debounces a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==========================================
// NETWORK UTILITIES
// ==========================================

/**
 * Checks if the app is online
 * @returns {boolean} Online status
 */
export function isOnline() {
    return navigator.onLine;
}

/**
 * Generates a random 4-digit PIN
 * @returns {string} 4-digit PIN
 */
export function generatePIN() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

// ==========================================
// CONSTANTS
// ==========================================

export const CONSTANTS = {
    SPLASH_DELAY: 800,
    DEBOUNCE_DELAY: 300,
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    PIN_LENGTH: 4,
    CACHE_VERSION: `v1.4.0-${Date.now()}`,
    SEARCH_THRESHOLD: 0.3,
    PDF_SCALE: 1.5,
    PDF_PAGE_BUFFER: 2 // Number of pages to render ahead
};
