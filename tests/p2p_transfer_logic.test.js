
import { P2PService } from '../src/p2p.js';

jest.mock('../src/db.js', () => ({
  db: {
    deleteFileChunks: jest.fn().mockResolvedValue(true),
    addChunk: jest.fn().mockResolvedValue(true),
    getFileChunks: jest.fn().mockResolvedValue([]),
  }
}));

Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234'
  },
  writable: true
});
global.crypto = window.crypto;

global.RTCPeerConnection = class {};

if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function() {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsArrayBuffer(this);
        });
    };
}

describe('P2P Transfer Logic', () => {
    let sender;
    let receiver;

    beforeEach(() => {
        sender = new P2PService();
        receiver = new P2PService();

        sender.conn = { send: jest.fn() };
        receiver.conn = { send: jest.fn() };

        sender.mode = 'online';
        receiver.mode = 'online';
    });

    test('Sender should wait for transfer-accepted before sending chunks', async () => {
        const file = new Blob(['test content'], { type: 'text/plain' });
        file.name = 'test.txt';

        const sendSpy = sender.conn.send;

        const sendPromise = sender.sendFile(file);

        expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'meta',
            name: 'test.txt'
        }));

        const metaPacket = sendSpy.mock.calls[0][0];
        const transferId = metaPacket.transferId;

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(sendSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'chunk' }));

        sender._handleData({
            type: 'transfer-accepted',
            transferId: transferId
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'chunk',
            index: 0
        }));
    });
});
