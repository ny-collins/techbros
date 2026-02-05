/* === FILE INTEGRITY UTILITIES === */

export const integrity = {    async calculateFileHash(file) {
        try {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('[Integrity] Hash calculation failed:', error);
            throw new Error('Failed to calculate file hash');
        }
    },    async calculateChunkHash(data) {
        try {
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('[Integrity] Chunk hash calculation failed:', error);
            throw new Error('Failed to calculate chunk hash');
        }
    },    async calculateCombinedHash(chunks) {
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
    },    verifyHash(expectedHash, actualHash) {
        if (!expectedHash || !actualHash) return false;
        return expectedHash.toLowerCase() === actualHash.toLowerCase();
    },    async createFileMetadata(file) {
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
    },    async verifyReceivedFile(receivedFile, metadata) {
        try {
            if (!metadata || !metadata.hash || metadata.size === undefined) {
                return true;
            }
            
            if (!receivedFile) {
                throw new Error('Received file is null or undefined');
            }
            
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
    },    bytesToHex(bytes) {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    },    compareHashes(hash1, hash2) {
        if (hash1 === '' && hash2 === '') return true;
        if (!hash1 || !hash2) return false;
        return hash1.trim().toLowerCase() === hash2.trim().toLowerCase();
    },    async generateChecksum(buffer) {
        try {
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('[Integrity] Checksum generation failed:', error);
            throw new Error('Failed to generate checksum');
        }
    }
};