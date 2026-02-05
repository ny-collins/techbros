import { integrity } from '../src/utils/integrity.js';

// Helper to create mock File with arrayBuffer method
function createMockFile(content, name, type) {
    const file = new File([content], name, { type });
    // Add arrayBuffer method if not present (jsdom issue)
    if (!file.arrayBuffer) {
        file.arrayBuffer = async function() {
            const reader = new FileReader();
            return new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(this);
            });
        };
    }
    return file;
}

describe('Integrity Verification', () => {
    describe('calculateFileHash()', () => {
        test('calculates SHA-256 hash for file', async () => {
            const content = 'test content';
            const file = createMockFile(content, 'test.txt', 'text/plain');
            
            const hash = await integrity.calculateFileHash(file);
            
            expect(hash).toBeTruthy();
            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
        });

        test('produces consistent hash for same content', async () => {
            const content = 'same content';
            const file1 = createMockFile(content, 'file1.txt', 'text/plain');
            const file2 = createMockFile(content, 'file2.txt', 'text/plain');
            
            const hash1 = await integrity.calculateFileHash(file1);
            const hash2 = await integrity.calculateFileHash(file2);
            
            expect(hash1).toBe(hash2);
        });

        test('produces different hash for different content', async () => {
            const file1 = createMockFile('content A', 'file1.txt', 'text/plain');
            const file2 = createMockFile('content B', 'file2.txt', 'text/plain');
            
            const hash1 = await integrity.calculateFileHash(file1);
            const hash2 = await integrity.calculateFileHash(file2);
            
            expect(hash1).not.toBe(hash2);
        });

        test('handles empty file', async () => {
            const file = createMockFile('', 'empty.txt', 'text/plain');
            
            const hash = await integrity.calculateFileHash(file);
            
            expect(hash).toBeTruthy();
            expect(hash.length).toBe(64);
        });

        test('handles large file in chunks', async () => {
            // Create 10MB file
            const size = 10 * 1024 * 1024;
            const buffer = new ArrayBuffer(size);
            const file = createMockFile(buffer, 'large.bin', 'application/octet-stream');
            
            const hash = await integrity.calculateFileHash(file);
            
            expect(hash).toBeTruthy();
            expect(hash.length).toBe(64);
        }, 10000); // Increase timeout for large file

        test('handles binary file', async () => {
            const buffer = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
            const file = createMockFile(buffer, 'binary.bin', 'application/octet-stream');
            
            const hash = await integrity.calculateFileHash(file);
            
            expect(hash).toBeTruthy();
            expect(hash.length).toBe(64);
        });

        test('rejects null file', async () => {
            await expect(integrity.calculateFileHash(null)).rejects.toThrow();
        });

        test('rejects undefined file', async () => {
            await expect(integrity.calculateFileHash(undefined)).rejects.toThrow();
        });
    });

    describe('verifyReceivedFile()', () => {
        test('returns true for matching hash', async () => {
            const content = 'test content';
            const file = createMockFile(content, 'test.txt', 'text/plain');
            
            // Calculate expected hash
            const expectedHash = await integrity.calculateFileHash(file);
            
            // Verify with same content
            const blob = new Blob([content], { type: 'text/plain' });
            const transfer = { hash: expectedHash };
            
            const result = await integrity.verifyReceivedFile(blob, transfer);
            
            expect(result).toBe(true);
        });

        test('returns false for mismatching hash', async () => {
            const originalContent = 'original content';
            const file = createMockFile(originalContent, 'test.txt', 'text/plain');
            
            // Calculate hash for original
            const expectedHash = await integrity.calculateFileHash(file);
            
            // Verify with different content - create mock with different content
            const tamperedFile = createMockFile('tampered content', 'test.txt', 'text/plain');
            const transfer = { hash: expectedHash, size: tamperedFile.size };
            
            const result = await integrity.verifyReceivedFile(tamperedFile, transfer);
            
            expect(result).toBe(false);
        });

        test('returns true when no hash provided (skip verification)', async () => {
            const blob = new Blob(['content'], { type: 'text/plain' });
            const transfer = { hash: null };
            
            const result = await integrity.verifyReceivedFile(blob, transfer);
            
            expect(result).toBe(true);
        });

        test('returns true for empty transfer object', async () => {
            const blob = new Blob(['content'], { type: 'text/plain' });
            
            const result = await integrity.verifyReceivedFile(blob, {});
            
            expect(result).toBe(true);
        });

        test('handles Blob input', async () => {
            const content = 'blob content';
            const blob = new Blob([content], { type: 'text/plain' });
            
            // Calculate hash from File
            const file = createMockFile(content, 'test.txt', 'text/plain');
            const expectedHash = await integrity.calculateFileHash(file);
            
            const transfer = { hash: expectedHash };
            const result = await integrity.verifyReceivedFile(blob, transfer);
            
            expect(result).toBe(true);
        });

        test('handles File input', async () => {
            const content = 'file content';
            const file = createMockFile(content, 'test.txt', 'text/plain');
            
            const expectedHash = await integrity.calculateFileHash(file);
            
            const transfer = { hash: expectedHash };
            const result = await integrity.verifyReceivedFile(file, transfer);
            
            expect(result).toBe(true);
        });
    });

    describe('bytesToHex()', () => {
        test('converts byte array to hex string', () => {
            const bytes = new Uint8Array([0, 15, 255, 128, 64]);
            const hex = integrity.bytesToHex(bytes);
            
            expect(hex).toBe('000fff8040');
        });

        test('handles empty array', () => {
            const bytes = new Uint8Array([]);
            const hex = integrity.bytesToHex(bytes);
            
            expect(hex).toBe('');
        });

        test('handles single byte', () => {
            const bytes = new Uint8Array([42]);
            const hex = integrity.bytesToHex(bytes);
            
            expect(hex).toBe('2a');
        });

        test('pads single digit hex values', () => {
            const bytes = new Uint8Array([0, 1, 2, 3, 4, 5]);
            const hex = integrity.bytesToHex(bytes);
            
            expect(hex).toBe('000102030405');
            expect(hex.length).toBe(12); // 6 bytes * 2 hex chars
        });
    });

    describe('compareHashes()', () => {
        test('returns true for identical hashes', () => {
            const hash1 = 'abcdef1234567890';
            const hash2 = 'abcdef1234567890';
            
            const result = integrity.compareHashes(hash1, hash2);
            
            expect(result).toBe(true);
        });

        test('returns false for different hashes', () => {
            const hash1 = 'abcdef1234567890';
            const hash2 = 'fedcba0987654321';
            
            const result = integrity.compareHashes(hash1, hash2);
            
            expect(result).toBe(false);
        });

        test('is case-insensitive', () => {
            const hash1 = 'ABCDEF1234567890';
            const hash2 = 'abcdef1234567890';
            
            const result = integrity.compareHashes(hash1, hash2);
            
            expect(result).toBe(true);
        });

        test('handles empty strings', () => {
            const result = integrity.compareHashes('', '');
            
            expect(result).toBe(true);
        });

        test('returns false for null values', () => {
            expect(integrity.compareHashes(null, 'hash')).toBe(false);
            expect(integrity.compareHashes('hash', null)).toBe(false);
            expect(integrity.compareHashes(null, null)).toBe(false);
        });

        test('returns false for undefined values', () => {
            expect(integrity.compareHashes(undefined, 'hash')).toBe(false);
            expect(integrity.compareHashes('hash', undefined)).toBe(false);
        });

        test('trims whitespace', () => {
            const hash1 = '  abc123  ';
            const hash2 = 'abc123';
            
            const result = integrity.compareHashes(hash1, hash2);
            
            expect(result).toBe(true);
        });
    });

    describe('generateChecksum()', () => {
        test('generates checksum for ArrayBuffer', async () => {
            const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
            
            const checksum = await integrity.generateChecksum(buffer);
            
            expect(checksum).toBeTruthy();
            expect(typeof checksum).toBe('string');
            expect(checksum.length).toBe(64);
        });

        test('produces consistent checksum', async () => {
            const buffer1 = new Uint8Array([1, 2, 3]).buffer;
            const buffer2 = new Uint8Array([1, 2, 3]).buffer;
            
            const checksum1 = await integrity.generateChecksum(buffer1);
            const checksum2 = await integrity.generateChecksum(buffer2);
            
            expect(checksum1).toBe(checksum2);
        });

        test('produces different checksums for different data', async () => {
            const buffer1 = new Uint8Array([1, 2, 3]).buffer;
            const buffer2 = new Uint8Array([4, 5, 6]).buffer;
            
            const checksum1 = await integrity.generateChecksum(buffer1);
            const checksum2 = await integrity.generateChecksum(buffer2);
            
            expect(checksum1).not.toBe(checksum2);
        });
    });

    describe('Edge Cases', () => {
        test('handles concurrent hash calculations', async () => {
            const files = [
                createMockFile('content1', 'file1.txt', 'text/plain'),
                createMockFile('content2', 'file2.txt', 'text/plain'),
                createMockFile('content3', 'file3.txt', 'text/plain')
            ];
            
            const hashes = await Promise.all(
                files.map(file => integrity.calculateFileHash(file))
            );
            
            expect(hashes).toHaveLength(3);
            expect(new Set(hashes).size).toBe(3); // All unique
        });

        test('handles file with special characters in name', async () => {
            const file = createMockFile('content', 'test @#$%.txt', 'text/plain');
            
            const hash = await integrity.calculateFileHash(file);
            
            expect(hash).toBeTruthy();
            expect(hash.length).toBe(64);
        });

        test('hash calculation preserves file object', async () => {
            const file = createMockFile('content', 'test.txt', 'text/plain');
            const originalSize = file.size;
            
            await integrity.calculateFileHash(file);
            
            expect(file.size).toBe(originalSize);
            expect(file.name).toBe('test.txt');
        });
    });

    describe('Performance', () => {
        test('calculates hash for medium file within time limit', async () => {
            // 1MB file
            const size = 1024 * 1024;
            const buffer = new ArrayBuffer(size);
            const file = createMockFile(buffer, 'medium.bin', 'application/octet-stream');
            
            const start = Date.now();
            const hash = await integrity.calculateFileHash(file);
            const duration = Date.now() - start;
            
            expect(hash).toBeTruthy();
            expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
        });

        test('handles multiple sequential verifications', async () => {
            const content = 'test';
            const file = createMockFile(content, 'test.txt', 'text/plain');
            const hash = await integrity.calculateFileHash(file);
            
            const blob = new Blob([content], { type: 'text/plain' });
            const transfer = { hash };
            
            // Run 10 verifications
            const results = await Promise.all(
                Array(10).fill().map(() => integrity.verifyReceivedFile(blob, transfer))
            );
            
            expect(results.every(r => r === true)).toBe(true);
        });
    });
});
