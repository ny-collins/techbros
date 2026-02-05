/* === ERROR HANDLING UTILITIES === */

export const errorHandler = {    wrapAsync(asyncFn, context = 'Operation', fallback = null) {
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
    },    wrapSync(syncFn, context = 'Operation', fallback = null) {
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
    },    async safeFetch(url, options = {}, maxRetries = 3) {
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
    },    async safeIDBOperation(operation, context = 'IDB Operation') {
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
    },    validateFile(file, allowedTypes = [], maxSize = 500 * 1024 * 1024) {
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
    },    dispatchError(error, context) {
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
    },    async clearOldCache() {
        try {
            const cacheNames = await caches.keys();
            const oldCaches = cacheNames.filter(name => 
                name.includes('techbros') && !name.includes('v3.0.0')
            );
            
            await Promise.all(oldCaches.map(name => caches.delete(name)));
        } catch (error) {
            console.warn('[ErrorHandler] Cache cleanup failed:', error);
        }
    },    async safePromise(promise, defaultValue = null) {
        try {
            return await promise;
        } catch (error) {
            console.warn('[SafePromise] Promise rejected:', error);
            return defaultValue;
        }
    }
};