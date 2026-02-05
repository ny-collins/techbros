# TechBros Library

**Offline-First Educational Resource Platform with Peer-to-Peer Sharing**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen)](package.json)
[![Tests](https://img.shields.io/badge/tests-81%20passing-success)](test/)

TechBros Library is a Progressive Web Application designed for educational resource distribution in bandwidth-constrained environments. It enables students to access, organize, and share study materials (PDFs, audio, video) with minimal internet dependency through a hybrid architecture combining static site delivery with peer-to-peer file transfer.

## Features

**Offline-First Architecture**
- Full functionality without internet after initial load
- Service Worker-based aggressive caching
- IndexedDB local storage for files and metadata

**Peer-to-Peer File Sharing**
- Direct WebRTC-based transfers between devices
- QR code sharing for offline environments
- Resumable transfers with integrity verification
- Real-time chat during file transfers

**Universal Content Viewer**
- PDF rendering with zoom and navigation controls
- HTML5 video and audio playback
- Metadata extraction for audio files
- Cover image generation

**Smart Search**
- Fuzzy search with typo tolerance
- Web Worker-based processing
- Real-time filtering

**Progressive Web App**
- Install to home screen on mobile devices
- Responsive design for all screen sizes
- Dark and light theme support
- Accessible keyboard navigation

## Technology Stack

**Frontend:** Vanilla JavaScript (ES2020+), Service Worker API, IndexedDB, WebRTC  
**Build System:** Vite 7.3.1, Babel 7.29.0, ESLint 9.39.2  
**Testing:** Jest 30.2.0, JSDOM 30.2.0  
**Cloud Infrastructure:** Cloudflare Pages, Workers, R2 Object Storage  
**Dependencies:** PeerJS 1.5.4, PDF.js 5.4.624, Phosphor Icons 2.1.1

## Architecture Overview

The system operates on a client-centric architecture where business logic resides in the browser. The cloud infrastructure serves as an optional enhancement for resource synchronization and centralized catalog management.

```
┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│   Browser   │◄────────►│  IndexedDB   │          │  Cloudflare │
│  (UI + Logic)│         │  (Local DB)  │          │    Edge     │
└──────┬──────┘          └──────────────┘          └──────┬──────┘
       │                                                   │
       │                  WebRTC P2P                       │
       │◄──────────────────────────────────────────────►  │
       │                                                   │
       └───────────────── HTTP/HTTPS ─────────────────────┘
```

**Key Components:**

- **Store (store.js):** Centralized state management singleton
- **P2P Service (p2p.js):** WebRTC connection management and file transfer
- **Database Wrapper (db.js):** IndexedDB abstraction layer
- **PDF Viewer (pdf-viewer.js):** Canvas-based PDF rendering
- **Service Worker (sw.js):** Offline caching and fetch interception
- **Router (ui/router.js):** Single-page application routing

For detailed technical documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Installation

### Prerequisites

- Node.js >= 20.19.0 or >= 22.12.0
- npm >= 10.0.0

### Setup

```bash
# Clone repository
git clone https://github.com/ny-collins/techbros.git
cd techbros

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`.

## Usage

### Development Mode

```bash
# Start dev server with hot reload
npm run dev

# Run linter
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Production Build

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

Build output will be generated in the `dist/` directory.

### Deployment

The project is configured for automatic deployment to Cloudflare Pages:

```bash
# Manual deployment
npm run deploy
```

**Environment Configuration:**

Create a `.env` file based on `.env.example`:

```env
# Cloudflare R2 Configuration
BUCKET_NAME=techbros-uploads
ACCOUNT_ID=your_cloudflare_account_id
```

Cloudflare R2 binding is configured in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "techbros-uploads"
```

### Resource Management

```bash
# Add resource to local catalog (development)
npm run add

# Upload resources to R2 bucket
npm run upload
```

## Project Structure

```
techbros/
├── src/                    # Application source code
│   ├── app.js              # Entry point
│   ├── store.js            # State management
│   ├── p2p.js              # WebRTC P2P service
│   ├── db.js               # IndexedDB wrapper
│   ├── pdf-viewer.js       # PDF rendering
│   ├── ui/                 # UI components
│   └── utils/              # Utilities (error handling, security, integrity)
├── public/                 # Static assets
│   ├── sw.js               # Service Worker
│   ├── vendor/             # Third-party libraries
│   └── fonts/              # Web fonts
├── functions/              # Cloudflare Workers
│   ├── api/                # API endpoints (list, upload)
│   └── cdn/                # CDN proxy
├── test/                   # Jest unit tests
├── scripts/                # Build scripts
├── docs/                   # Documentation
└── dist/                   # Build output (generated)
```

## Testing

The project includes comprehensive unit tests covering core functionality:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test Coverage:**

- Store state management
- P2P transfer logic and IndexedDB integration
- PDF viewer functionality
- Error handling and recovery
- File integrity verification
- Upload flow integration

## API Reference

### Store API

```javascript
import { store } from './src/store.js';

// Initialize store
await store.init();

// Load resource
const resource = await store.loadResource(resourceId);

// Download from cloud
await store.downloadResource(url, metadata);

// Delete resource
await store.deleteResource(resourceId);

// Search resources
const results = await store.search(query);
```

### P2P Service API

```javascript
import { p2p } from './src/p2p.js';

// Initialize P2P (online mode)
await p2p.init('unique-peer-id');

// Generate QR code for offline sharing
const qrData = await p2p.createManualOffer();

// Send file
await p2p.sendFile(resourceId, file);

// Listen for events
p2p.addEventListener('transfer-progress', (event) => {
  console.log(`Progress: ${event.detail.progress}%`);
});
```

### Database API

```javascript
import { db } from './src/db.js';

// Initialize database
await db.init();

// Store resource metadata
await db.addResource(metadata);

// Store file chunks
await db.addChunk(resourceId, chunkIndex, arrayBuffer);

// Retrieve resource
const resource = await db.getResource(resourceId);

// Retrieve all chunks
const chunks = await db.getChunks(resourceId);
```

## Performance

**Optimization Strategies:**

- **Code Splitting:** Vite automatically splits vendor libraries from application code
- **Lazy Loading:** PDF.js and PeerJS loaded on-demand
- **Virtual Scrolling:** Library view renders only visible items
- **Web Worker Offloading:** Search operations run in dedicated worker thread
- **Batch Writes:** P2P transfers write chunks to IndexedDB in batches to reduce transaction overhead
- **Connection Pooling:** IndexedDB connection remains open to avoid repeated initialization

**Benchmarks (Tested on Mid-Range Android Device):**

- Application load time: <2s (cached)
- PDF rendering (10MB file): <3s
- P2P transfer speed: 2-5 MB/s (local network)
- Search query execution: <100ms (1000 items)

## Security

**Security Measures:**

- **Content Security Policy:** Strict CSP prevents XSS and restricts external connections
- **Input Sanitization:** All user input sanitized before rendering
- **File Integrity Verification:** SHA-256 hashing validates downloaded files
- **Secure Context:** HTTPS required for Service Worker and WebRTC
- **Origin Isolation:** No third-party scripts except PeerJS signaling

**Threat Model:**

The application assumes a benign network environment for P2P transfers. For sensitive data, additional end-to-end encryption should be implemented.

## Browser Support

**Minimum Requirements:**

- Chrome 90+ / Edge 90+
- Firefox 88+
- Safari 15.4+
- Chrome Android 90+
- Safari iOS 15.4+

**Required APIs:**

- Service Worker
- IndexedDB
- WebRTC DataChannel
- File System Access API (optional, fallback to IndexedDB)
- Web Workers
- ES2020 features (BigInt, Optional Chaining, Nullish Coalescing)

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/enhancement`)
3. Commit changes with descriptive messages
4. Run tests and linter (`npm test && npm run lint`)
5. Push to your fork and submit a pull request

**Coding Standards:**

- Follow ESLint configuration (no console warnings, strict equality, curly braces)
- Write unit tests for new features
- Update documentation for API changes
- Use semantic commit messages

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- **PDF.js** by Mozilla for PDF rendering
- **PeerJS** for WebRTC abstraction
- **Phosphor Icons** for UI iconography
- **Cloudflare** for edge infrastructure

## Support

For issues, feature requests, or questions:

- **Issues:** [GitHub Issues](https://github.com/ny-collins/techbros/issues)
- **Email:** mwangicollins391@gmail.com
- **Repository:** [github.com/ny-collins/techbros](https://github.com/ny-collins/techbros)

## Roadmap

**Planned Features:**

- End-to-end encryption for P2P transfers
- Multi-peer simultaneous downloads
- Offline-first PWA background sync
- Progressive image loading
- Advanced PDF annotations

**Version History:**

- **v3.0.0** (Current): Jest 30, Vite 7, music-metadata 11 upgrades, comprehensive test coverage
- **v2.0.0:** Complete P2P implementation with resumable transfers
- **v1.0.0:** Initial release with basic offline functionality

---

**Built with care for students everywhere.**
