import 'jest-environment-jsdom';

global.__APP_VERSION__ = '2.0.0';

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

global.fetch = jest.fn();

global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() => Promise.resolve({ scope: '/' })),
  },
  writable: true,
});

// Mock Web Crypto API for integrity tests
if (!global.crypto) {
  global.crypto = {};
}

if (!global.crypto.subtle) {
  global.crypto.subtle = {
    digest: jest.fn(async (algorithm, data) => {
      // Simple hash mock - returns consistent hash for same input
      const buffer = data instanceof ArrayBuffer ? data : data.buffer;
      const view = new Uint8Array(buffer);
      
      // Create a simple deterministic "hash" from the data
      // In real tests, we just need consistency, not security
      let hash = 0;
      for (let i = 0; i < view.length; i++) {
        hash = ((hash << 5) - hash) + view[i];
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Return a 32-byte ArrayBuffer (SHA-256 size)
      const hashBuffer = new ArrayBuffer(32);
      const hashView = new DataView(hashBuffer);
      // Fill with deterministic pattern based on hash
      for (let i = 0; i < 8; i++) {
        hashView.setUint32(i * 4, hash + i, false);
      }
      
      return hashBuffer;
    }),
  };
}
