import { p2p } from '../src/p2p.js';
import { db } from '../src/db.js';

jest.mock('../src/db.js', () => ({
    db: {
        addChunk: jest.fn(() => Promise.resolve()),
        getFileChunks: jest.fn(() => Promise.resolve([new ArrayBuffer(10), new ArrayBuffer(10)])),
        deleteFileChunks: jest.fn(() => Promise.resolve()),
        open: jest.fn(() => Promise.resolve({}))
    }
}));

jest.mock('peerjs', () => {
    return {
        Peer: jest.fn().mockImplementation(() => ({
            on: jest.fn(),
            destroy: jest.fn(),
            connect: jest.fn()
        }))
    };
});

describe('P2PService - IndexedDB Fallback', () => {
    beforeEach(() => {
        p2p.destroy();
        jest.clearAllMocks();
        delete window.showSaveFilePicker;
    });

    test('stores chunks in IDB when File System Access API is missing', async () => {
        const fileName = 'video.mp4';
        const fileSize = 1000;
        const totalChunks = 2;
        const mime = 'video/mp4';
        const transferId = 'test-uuid-1234';

        const metaData = { type: 'meta', name: fileName, size: fileSize, mime, totalChunks, transferId };
        await p2p._processChunk(metaData);

        expect(db.deleteFileChunks).toHaveBeenCalledWith(transferId);
        expect(p2p.receivingChunks.has(transferId)).toBe(true);
        expect(p2p.receivingChunks.get(transferId).storage).toBeUndefined(); 

        const chunk0 = { type: 'chunk', index: 0, total: totalChunks, data: new ArrayBuffer(500), name: fileName, transferId };
        await p2p._processChunk(chunk0);

        const chunk1 = { type: 'chunk', index: 1, total: totalChunks, data: new ArrayBuffer(500), name: fileName, transferId };

        const receivedSpy = jest.fn();
        p2p.addEventListener('file-received', receivedSpy);

        await p2p._processChunk(chunk1);

        expect(db.addChunk).toHaveBeenCalledTimes(2);
        expect(db.addChunk).toHaveBeenCalledWith(transferId, 0, chunk0.data);
        expect(db.addChunk).toHaveBeenCalledWith(transferId, 1, chunk1.data);

        expect(db.getFileChunks).toHaveBeenCalledWith(transferId);
        expect(db.deleteFileChunks).toHaveBeenCalledTimes(2);
        
        expect(receivedSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                name: fileName,
                mime: mime
            })
        }));
    });
});