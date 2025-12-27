# TechBros Library - Project Context

## Project Overview

**TechBros Library** is an **Offline-First Educational Resource Platform (PWA)** designed for environments with limited or no internet connectivity. It enables the distribution of educational materials (PDFs, Audio, Video) using **Peer-to-Peer (P2P) networking** via WebRTC.

The application operates as a **zero-backend** static site, relying on client-side storage (Service Workers, IndexedDB) and direct device-to-device communication.

### Key Features
*   **Offline-First:** Fully functional without internet access.
*   **P2P File Sharing:**
    *   **Online:** Signaling via PeerJS WebSocket server.
    *   **Offline:** Manual signaling via QR Code scanning (Host <-> Client).
*   **Resource Management:** Searchable library of PDFs, MP3s, and MP4s.
*   **Streaming Downloads:** Uses File System Access API to handle large files efficiently.

## Technology Stack

*   **Language:** JavaScript (ES Modules / ES2020+)
*   **Build Tool:** [Vite](https://vitejs.dev/) (Rollup-based)
*   **Testing:** [Jest](https://jestjs.io/) (Unit & Integration)
*   **P2P Networking:** WebRTC (Data Channels), [PeerJS](https://peerjs.com/)
*   **Storage:** Cache API, LocalStorage, File System Access API
*   **Other Libraries:** `html5-qrcode` (QR Scanning), `qrcode` (QR Generation), `pdf-lib`.

## Architecture

The project follows a modular client-side architecture (`src/`):

*   **`src/app.js`**: Main entry point. Initializes the application.
*   **`src/store.js`**: State management (user preferences, resource index).
*   **`src/ui.js`**: DOM manipulation, rendering, and event handling.
*   **`src/p2p.js`**: Handles WebRTC connections (Online & Offline signaling logic).
*   **`src/db.js`**: IndexedDB wrapper for temporary file chunk storage (fallback for streaming).
*   **`src/search-worker.js`**: Offloads search processing to a web worker.
*   **`scripts/`**: Node.js scripts for maintenance (e.g., `add_resource.js` to index new files).

See `docs/ARCHITECTURE.md` for a detailed deep dive.

## Development Workflow

### Installation
```bash
npm install
```

### Run Development Server
Starts the Vite server with Hot Module Replacement (HMR).
```bash
npm run dev
```

### Build for Production
Generates optimized static assets in `dist/` and updates the Service Worker version.
```bash
npm run build
```

### Run Tests
Executes the Jest test suite.
```bash
npm test
# or
npm run test:watch
```

### Add New Resources
To add a file to the library index (`public/resources.json`):
1.  Place the file in `public/resources/`.
2.  Run the helper script:
    ```bash
    npm run add
    ```

## Directory Structure

*   **`src/`**: Application source code.
*   **`public/`**: Static assets served directly.
    *   `resources/`: The actual educational content files.
    *   `resources.json`: The metadata index for the library.
*   **`tests/`**: Jest test files.
*   **`docs/`**: Project documentation.
*   **`scripts/`**: Utility scripts for build and maintenance.
