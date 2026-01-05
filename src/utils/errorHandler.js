/* === ERROR HANDLING UTILITIES === */

export const errorHandler = {
    
    /**
     * Wraps async functions with error handling
     * @param {Function} asyncFn - Async function to wrap
     * @param {string} context - Context for error reporting
     * @param {Function} fallback - Fallback function on error
     * @returns {Function} Wrapped function
     */
    wrapAsync(asyncFn, context = 'Operation', fallback = null) {
        return async (...args) => {
            try {
                return await asyncFn.apply(this, args);
            } catch (error) {
                console.error(`[${context}] Error:`, error);
                
                if (fallback) {
                    try {
                        return await fallback.apply(this, args);
                    } catch (fallbackError) {
                        console.error(`[${context}] Fallback failed:`, fallbackError);
                    }
                }
                
                this.dispatchError(error, context);
                throw error;
            }
        };
    },
    
    /**
     * Wraps sync functions with error handling
     * @param {Function} syncFn - Sync function to wrap
     * @param {string} context - Context for error reporting
     * @param {Function} fallback - Fallback function on error
     * @returns {Function} Wrapped function
     */
    wrapSync(syncFn, context = 'Operation', fallback = null) {
        return (...args) => {
            try {
                return syncFn.apply(this, args);
            } catch (error) {
                console.error(`[${context}] Error:`, error);
                
                if (fallback) {
                    try {
                        return fallback.apply(this, args);
                    } catch (fallbackError) {
                        console.error(`[${context}] Fallback failed:`, fallbackError);
                    }
                }
                
                this.dispatchError(error, context);
                throw error;
            }
        };
    },
    
    /**
     * Handles fetch operations with retry logic
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise<Response>} Fetch response
     */
    async safeFetch(url, options = {}, maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                lastError = error;
                console.warn(`[SafeFetch] Attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                if (error.name === 'AbortError' || error.message.includes('400')) {
                    break;
                }
                
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    },
    
    /**
     * Handles IndexedDB operations with error recovery
     * @param {Function} operation - IDB operation function
     * @param {string} context - Operation context
     * @returns {Promise} Operation result
     */
    async safeIDBOperation(operation, context = 'IDB Operation') {
        try {
            return await operation();
        } catch (error) {
            console.error(`[${context}] IDB Error:`, error);
            
            if (error.name === 'QuotaExceededError') {
                try {
                    await this.clearOldCache();
                    return await operation();
                } catch (retryError) {
                    throw new Error('Storage quota exceeded. Please clear some cached files.');
                }
            }
            
            if (error.name === 'InvalidStateError' || error.name === 'TransactionInactiveError') {
                try {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return await operation();
                } catch (retryError) {
                    throw new Error('Database connection error. Please refresh the page.');
                }
            }
            
            throw error;
        }
    },
    
    /**
     * Handles file operations with validation
     * @param {File} file - File to validate
     * @param {Array} allowedTypes - Allowed MIME types
     * @param {number} maxSize - Maximum file size in bytes
     * @returns {boolean} Whether file is valid
     */
    validateFile(file, allowedTypes = [], maxSize = 500 * 1024 * 1024) {
        if (!file || !(file instanceof File)) {
            throw new Error('Invalid file object');
        }
        
        if (file.size === 0) {
            throw new Error('File is empty');
        }
        
        if (file.size > maxSize) {
            throw new Error(`File size exceeds limit (${Math.round(maxSize / 1024 / 1024)}MB max)`);
        }
        
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            throw new Error('File type not allowed');
        }
        
        return true;
    },
    
    /**
     * Dispatches error events for UI handling
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    dispatchError(error, context) {
        const errorEvent = new CustomEvent('app-error', {
            detail: {
                error: error,
                context: context,
                message: error.message,
                timestamp: Date.now()
            }
        });
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(errorEvent);
        }
    },
    
    /**
     * Clears old cache entries to free up space
     * @returns {Promise<void>}
     */
    async clearOldCache() {
        try {
            const cacheNames = await caches.keys();
            const oldCaches = cacheNames.filter(name => 
                name.includes('techbros') && !name.includes('v3.0.0')
            );
            
            await Promise.all(oldCaches.map(name => caches.delete(name)));
            console.log('[ErrorHandler] Cleared old caches:', oldCaches.length);
        } catch (error) {
            console.warn('[ErrorHandler] Cache cleanup failed:', error);
        }
    },
    
    /**
     * Creates a safe promise that won't reject
     * @param {Promise} promise - Promise to wrap
     * @param {any} defaultValue - Default value on error
     * @returns {Promise} Safe promise
     */
    async safePromise(promise, defaultValue = null) {
        try {
            return await promise;
        } catch (error) {
            console.warn('[SafePromise] Promise rejected:', error);
            return defaultValue;
        }
    }
};