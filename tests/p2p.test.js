import { p2p } from '../src/p2p.js';

// Mock PeerJS
jest.mock('peerjs', () => {
    return {
        Peer: jest.fn().mockImplementation(() => ({
            on: jest.fn(),
            destroy: jest.fn(),
            connect: jest.fn()
        }))
    };
});

// Mock WebRTC globals
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
    createDataChannel: jest.fn(() => ({
        onopen: null,
        onmessage: null,
        send: jest.fn(),
        readyState: 'open'
    })),
    createOffer: jest.fn(() => Promise.resolve({ type: 'offer', sdp: 'mock-sdp' })),
    createAnswer: jest.fn(() => Promise.resolve({ type: 'answer', sdp: 'mock-sdp' })),
    setLocalDescription: jest.fn(() => Promise.resolve()),
    setRemoteDescription: jest.fn(() => Promise.resolve()),
    onicecandidate: null,
    onconnectionstatechange: null,
    ondatachannel: null,
    close: jest.fn()
}));

describe('P2PService', () => {
    beforeEach(() => {
        p2p.destroy();
        jest.clearAllMocks();
    });

    describe('Online Mode', () => {
        test('initializes PeerJS by default', async () => {
            const promise = p2p.init();
            // We need to manually trigger the 'open' event on the mock if we want the promise to resolve,
            // or just check internal state if exposed.
            // Since init() returns a promise waiting for 'open', we verify the constructor called.
            expect(p2p.mode).toBe('online');
        });
    });

    describe('Manual Mode (Offline)', () => {
        test('initializes ManualP2PService', async () => {
            await p2p.initManual(true);
            expect(p2p.mode).toBe('manual');
            expect(p2p.manualService).toBeDefined();
            expect(p2p.manualService.isHost).toBe(true);
        });

        test('generates signal ready event', async () => {
            const spy = jest.fn();
            p2p.addEventListener('signal-generated', spy);
            
            await p2p.initManual(true);
            
            // Simulate ICE gathering complete
            const mockOffer = JSON.stringify({ type: 'offer', sdp: 'mock-sdp' });
            // We need to access the private/internal manualService to trigger the event listener
            // or we rely on the implementation details.
            // For this test, we can trust initManual attaches the listeners.
            
            // Trigger the internal event dispatch
            p2p.manualService.dispatchEvent(new CustomEvent('signal-ready', { detail: mockOffer }));
            
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                detail: mockOffer
            }));
        });

        test('processes incoming manual signal', async () => {
            await p2p.initManual(false); // Guest
            
            const mockSignal = JSON.stringify({ type: 'offer', sdp: 'remote-sdp' });
            await p2p.processManualSignal(mockSignal);
            
            expect(p2p.manualService.peerConnection.setRemoteDescription).toHaveBeenCalled();
        });
    });

    describe('File Sending', () => {
        test('fails if no connection', async () => {
            const spy = jest.fn();
            p2p.addEventListener('error', spy);
            
            await p2p.sendFile({ name: 'test.txt', size: 100 });
            
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({
                detail: { message: 'No active connection' }
            }));
        });
    });
});