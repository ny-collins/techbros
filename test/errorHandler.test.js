import { errorHandler } from '../src/utils/errorHandler.js';

describe('Error Handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateFile()', () => {
        test('accepts valid PDF file', () => {
            const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
            const result = errorHandler.validateFile(file);
            
            expect(result).toBe(true);
        });

        test('accepts valid audio file', () => {
            const file = new File(['content'], 'song.mp3', { type: 'audio/mpeg' });
            const result = errorHandler.validateFile(file);
            
            expect(result).toBe(true);
        });

        test('accepts valid video file', () => {
            const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });
            const result = errorHandler.validateFile(file);
            
            expect(result).toBe(true);
        });

        test('rejects file exceeding size limit', () => {
            // Create 600MB file (exceeds default 500MB limit)
            const largeSize = 600 * 1024 * 1024;
            const file = new File(['x'], 'huge.pdf', { type: 'application/pdf' });
            Object.defineProperty(file, 'size', { value: largeSize });

            expect(() => errorHandler.validateFile(file)).toThrow('size');
        });

        test('rejects empty file', () => {
            const file = new File([''], 'empty.pdf', { type: 'application/pdf' });
            Object.defineProperty(file, 'size', { value: 0 });

            expect(() => errorHandler.validateFile(file)).toThrow('empty');
        });

        test('handles null file gracefully', () => {
            expect(() => errorHandler.validateFile(null)).toThrow('Invalid file');
        });

        test('handles undefined file gracefully', () => {
            expect(() => errorHandler.validateFile(undefined)).toThrow('Invalid file');
        });
    });

    describe('safeFetch()', () => {
        test('successfully fetches data', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ data: 'test' })
            });

            const response = await errorHandler.safeFetch('https://example.com/api');
            
            expect(response.ok).toBe(true);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('retries on failure', async () => {
            global.fetch = jest.fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200
                });

            const response = await errorHandler.safeFetch('https://example.com/api');
            
            expect(response.ok).toBe(true);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        test('throws after max retries', async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error('Persistent error'));

            await expect(
                errorHandler.safeFetch('https://example.com/api', {}, 3)
            ).rejects.toThrow('Persistent error');
            
            expect(fetch).toHaveBeenCalledTimes(3);
        });
    });

    describe('wrapAsync()', () => {
        test('returns result on success', async () => {
            const successFn = async (x) => x * 2;
            const wrapped = errorHandler.wrapAsync(successFn, 'test');

            const result = await wrapped(5);
            
            expect(result).toBe(10);
        });

        test('throws and logs on error', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const errorFn = async () => { throw new Error('Test error'); };
            const wrapped = errorHandler.wrapAsync(errorFn, 'test');

            await expect(wrapped()).rejects.toThrow('Test error');
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });

        test('uses fallback on error', async () => {
            const errorFn = async () => { throw new Error('Test error'); };
            const fallback = async () => 'fallback result';
            const wrapped = errorHandler.wrapAsync(errorFn, 'test', fallback);

            const result = await wrapped();
            
            expect(result).toBe('fallback result');
        });
    });

    describe('wrapSync()', () => {
        test('returns result on success', () => {
            const successFn = (x) => x * 2;
            const wrapped = errorHandler.wrapSync(successFn, 'test');

            const result = wrapped(5);
            
            expect(result).toBe(10);
        });

        test('throws and logs on error', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const errorFn = () => { throw new Error('Test error'); };
            const wrapped = errorHandler.wrapSync(errorFn, 'test');

            expect(() => wrapped()).toThrow('Test error');
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });

    describe('dispatchError()', () => {
        test('dispatches error event', () => {
            const eventSpy = jest.spyOn(window, 'dispatchEvent');
            const error = new Error('Test error');
            
            errorHandler.dispatchError(error, 'test-context');
            
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'app-error',
                    detail: expect.objectContaining({
                        message: 'Test error',
                        context: 'test-context'
                    })
                })
            );
            
            eventSpy.mockRestore();
        });
    });

    describe('safePromise()', () => {
        test('returns promise result on success', async () => {
            const promise = Promise.resolve('success');
            
            const result = await errorHandler.safePromise(promise);
            
            expect(result).toBe('success');
        });

        test('returns default value on rejection', async () => {
            const promise = Promise.reject(new Error('Failed'));
            
            const result = await errorHandler.safePromise(promise, 'default');
            
            expect(result).toBe('default');
        });

        test('returns null if no default specified', async () => {
            const promise = Promise.reject(new Error('Failed'));
            
            const result = await errorHandler.safePromise(promise);
            
            expect(result).toBeNull();
        });
    });
});
