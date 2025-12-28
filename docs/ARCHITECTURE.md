# Architecture and Design Documentation

**Version:** 2.0.0
**Last Updated:** December 2025
**Author:** Collins Mwangi

---

## 1. Executive Summary

TechBros Library is an offline-first Progressive Web Application (PWA) engineered to facilitate the distribution of educational resources in environments with limited or no internet connectivity. The system utilizes a static client-side architecture combined with peer-to-peer (P2P) networking protocols to achieve decentralized content sharing.

### Design Principles

*   **Minimal Dependency:** Utilization of vanilla JavaScript (ES Modules) to reduce bundle size and runtime overhead.
*   **Offline Autonomy:** Full system functionality, including peer discovery and file transfer, operates independently of external network infrastructure.
*   **Static Deployment:** Elimination of server-side dependencies to minimize operational costs and deployment complexity.

---

## 2. System Architecture

The application follows a modular client-side architecture managed by a central application entry point.

### Component Diagram

```
[ Client Browser ]
    |
    |--- [ Presentation Layer ]
    |       |-- Sidebar Navigation
    |       |-- Search & Filter Interface
    |       |-- Resource Viewer (PDF/Media)
    |       |-- Settings & Configuration
    |
    |--- [ Application Core (src/app.js) ]
    |       |
    |       |-- [ State Manager (src/store.js) ]
    |       |       Manages application state, user preferences, and resource index.
    |       |
    |       |-- [ UI Facade (src/ui.js) ]
    |       |       Orchestrates UI modules:
    |       |       |-- [ Router (src/ui/router.js) ]: Navigation & History
    |       |       |-- [ Library (src/ui/library.js) ]: List rendering & filtering
    |       |       |-- [ Viewer (src/ui/viewer.js) ]: Media & PDF display
    |       |       |       |-- [ PDFViewer (src/pdf-viewer.js) ]: PDF.js wrapper
    |       |       |-- [ P2P UI (src/ui/p2p-ui.js) ]: Transfer controls
    |       |
    |       |-- [ P2P Service (src/p2p.js) ]
    |               |-- Online Signaling (PeerJS)
    |               |-- Offline Signaling (Manual/QR)
    |               |-- Data Channel Management
    |
    |--- [ Storage Layer ]
            |-- LocalStorage (User Preferences)
            |-- IndexedDB / Static JSON (Resource Index)
            |-- IndexedDB (File Chunks - Fallback)
            |-- Service Worker Cache (Application Assets & Content)
            |-- File System Access API (Streaming Downloads)
```

---

## 3. Technology Stack

*   **Runtime:** ECMAScript 2020+ (ES6 Modules)
*   **Build System:** Vite (Rollup-based bundling and minification)
*   **Networking:** WebRTC (Peer-to-Peer Data Channels)
*   **Signaling:** PeerJS (Online) / QR Code Encoding (Offline)
*   **Storage:** Cache API, LocalStorage, File System Access API, IndexedDB
*   **Testing:** Jest (Unit and Integration Testing)
*   **Libraries:** `pdfjs-dist` (PDF Rendering), `html5-qrcode`, `qrcode`.

---

## 4. Core Modules

### 4.1. Peer-to-Peer Service (`src/p2p.js`)

The P2P module implements a dual-mode signaling strategy to ensure connectivity in diverse network conditions.

#### Online Mode
Uses a WebSocket connection to a public signaling server to exchange ICE candidates and Session Description Protocol (SDP) data. This mode requires internet access for the initial handshake.

#### Offline (Manual) Mode
Bypasses external servers by encoding signaling data into QR codes.
1.  **Offer Generation:** The host device creates a WebRTC offer and encodes the SDP data into a QR code.
2.  **Scanning:** The client device scans the QR code to ingest the offer.
3.  **Answer Generation:** The client generates an answer SDP, displayed as a counter-QR code.
4.  **Connection:** The host scans the client's answer to establish the peer-to-peer data channel.

### 4.2. File Stream Management
To mitigate memory exhaustion risks on resource-constrained devices, the application implements streaming writes for file transfers.
*   **Protocol:** Incoming data chunks are written directly to the device storage using the `FileSystemWritableFileStream` interface.
*   **Memory Footprint:** Keeps only the current chunk (~64KB) in memory, rather than the entire file blob.

### 4.3. IndexedDB Fallback (`src/db.js`)
If the File System Access API is unavailable (e.g., on Mobile or Firefox), the system falls back to storing file chunks in IndexedDB.
*   **Process:** Chunks are written to an object store as they arrive.
*   **Assembly:** Once all chunks are received, they are concatenated into a Blob and offered for download.
*   **Cleanup:** The database is cleared after successful assembly or initialization.

---

## 5. Security Architecture

### Content Security Policy (CSP)
A strict CSP is enforced to mitigate Cross-Site Scripting (XSS) risks.
*   `default-src 'self'`: Restricts resource loading to the application origin.
*   `connect-src`: Permits WebSocket connections for signaling.
*   `script-src`: Disallows inline scripts and `eval()`.
*   `frame-ancestors 'self'`: Allows the app to frame its own content (required for PDF viewer).

### Resource Validation
*   **MIME Type Verification:** Incoming files are validated against an allowlist of educational formats (PDF, MP4, MP3).
*   **Sanitization:** User input and file metadata are sanitized before rendering to prevent DOM injection attacks.

### Storage Quota Management
Prior to initiating a file transfer, the system queries the `navigator.storage` API to verify sufficient available disk space, preventing incomplete transfers and storage saturation.

---

## 6. Build and Deployment

The project utilizes Vite for compilation and asset optimization.

*   **Development:** `npm run dev` starts a local server with Hot Module Replacement.
*   **Production:** `npm run build` generates a `dist/` directory containing minified JavaScript, CSS, and optimized assets suitable for deployment to static hosting environments (e.g., Cloudflare Pages, Nginx, Apache).

## 7. Configuration

Sensitive configuration (like TURN server credentials) is managed via environment variables.
*   **Local:** Create a `.env` file (see `.env.example`).
*   **Build:** Vite injects these variables (prefixed with `VITE_`) into the client-side bundle at build time.