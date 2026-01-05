/* === FILE INTEGRITY UTILITIES === */

export const integrity = {
    
    /**
     * Calculates SHA-256 hash of a file or blob
     * @param {File|Blob} file - File to hash
     * @returns {Promise<string>} Hex string of hash
     */
    async calculateFileHash(file) {
        try {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('[Integrity] Hash calculation failed:', error);
            throw new Error('Failed to calculate file hash');
        }
    },
    
    /**
     * Calculates SHA-256 hash of chunk data
     * @param {ArrayBuffer} data - Chunk data
     * @returns {Promise<string>} Hex string of hash
     */
    async calculateChunkHash(data) {
        try {
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('[Integrity] Chunk hash calculation failed:', error);
            throw new Error('Failed to calculate chunk hash');
        }
    },
    
    /**
     * Calculates hash for combined chunks in order
     * @param {ArrayBuffer[]} chunks - Array of chunk data in order
     * @returns {Promise<string>} Hex string of combined hash
     */
    async calculateCombinedHash(chunks) {
        try {
            const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
            const combined = new Uint8Array(totalSize);
            
            let offset = 0;
            for (const chunk of chunks) {
                combined.set(new Uint8Array(chunk), offset);
                offset += chunk.byteLength;
            }
            
            const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('[Integrity] Combined hash calculation failed:', error);
            throw new Error('Failed to calculate combined hash');
        }
    },
    
    /**
     * Verifies file integrity by comparing hashes
     * @param {string} expectedHash - Expected hash value
     * @param {string} actualHash - Actual calculated hash
     * @returns {boolean} Whether hashes match
     */
    verifyHash(expectedHash, actualHash) {
        if (!expectedHash || !actualHash) return false;
        return expectedHash.toLowerCase() === actualHash.toLowerCase();
    },
    
    /**
     * Creates integrity metadata for a file
     * @param {File} file - File to create metadata for
     * @returns {Promise<Object>} Metadata object with hash and size
     */
    async createFileMetadata(file) {
        try {
            const hash = await this.calculateFileHash(file);
            return {
                name: file.name,
                size: file.size,
                type: file.type,
                hash: hash,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('[Integrity] Failed to create file metadata:', error);
            throw error;
        }
    },
    
    /**
     * Verifies received file against metadata
     * @param {Blob} receivedFile - Received file blob
     * @param {Object} metadata - Original file metadata
     * @returns {Promise<boolean>} Whether file matches metadata
     */
    async verifyReceivedFile(receivedFile, metadata) {
        try {
            if (receivedFile.size !== metadata.size) {
                console.warn('[Integrity] Size mismatch:', receivedFile.size, 'vs', metadata.size);
                return false;
            }
            
            const receivedHash = await this.calculateFileHash(receivedFile);
            const isValid = this.verifyHash(metadata.hash, receivedHash);
            
            if (!isValid) {
                console.warn('[Integrity] Hash mismatch:', receivedHash, 'vs', metadata.hash);
            }
            
            return isValid;
        } catch (error) {
            console.error('[Integrity] File verification failed:', error);
            return false;
        }
    }
};