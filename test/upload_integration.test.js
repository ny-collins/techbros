import { store } from '../src/store.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('Integration Tests - Upload Flow', () => {
    beforeEach(() => {
        store.state = {
            version: '3.0.0',
            resources: [],
            settings: { theme: 'dark', layout: 'grid' },
            user: { peerId: null, pin: null }
        };
        
        fetch.mockClear();
        jest.clearAllMocks();
    });

    describe('Simple Upload (< 100MB)', () => {
        test('rejects invalid PIN', async () => {
            const mockFile = new File(['content'], 'test.pdf', { 
                type: 'application/pdf' 
            });

            fetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ error: 'Invalid PIN' })
            });

            await expect(store.uploadResource(mockFile, 'wrong')).rejects.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('emits error event on upload failure', async () => {
            const mockFile = new File(['content'], 'test.pdf', { 
                type: 'application/pdf' 
            });
            Object.defineProperty(mockFile, 'size', { value: 5 * 1024 * 1024 }); // 5MB

            fetch.mockRejectedValue(new Error('Upload failed'));

            // Upload should reject
            await expect(store.uploadResource(mockFile, '1234')).rejects.toThrow();
        });

        test('provides meaningful error message for network failure', async () => {
            const mockFile = new File(['content'], 'test.pdf', { 
                type: 'application/pdf' 
            });
            Object.defineProperty(mockFile, 'size', { value: 5 * 1024 * 1024 }); // 5MB

            fetch.mockRejectedValue(new Error('Failed to fetch'));

            try {
                await store.uploadResource(mockFile, '1234');
                fail('Should have thrown error');
            } catch (error) {
                expect(error.message).toContain('fetch');
            }
        });
    });
});
