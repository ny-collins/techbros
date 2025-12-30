# Architecture & Design - TechBros v2.0.0

**Author:** Collins Mwangi
**Version:** 2.0.0

## 1. System Overview

TechBros Library is a **Static Progressive Web Application**. It relies on the browser's advanced APIs (Service Workers, IndexedDB, WebRTC, File System Access) to deliver a native-app-like experience without a backend server.

### Design Philosophy
1.  **Client-Heavy:** Logic lives in the browser, not the server.
2.  **Offline-Default:** Network access is treated as an enhancement, not a requirement.
3.  **Ephemeral Signaling:** Servers are only used to handshake; data transfer is direct.

---

## 2. Core Architecture

### Component Diagram

```ascii
[ Browser Runtime ]
+-------------------------------------------------------+
|  [ UI Layer ]                                         |
|   - Router (Navigation)                               |
|   - Library (Grid/List View)                          |
|   - Viewer (PDF/Media Player)                         |
|   - P2P UI (QR Scanner, Transfer Monitor)             |
+-------------------------------------------------------+
        |                   ^
        v                   |
+-------------------------------------------------------+
|  [ Logic Layer ]                                      |
|   - App Controller (Bootstrapper)                     |
|   - Store (State Management)                          |
|   - P2P Service (WebRTC Engine)                       |
+-------------------------------------------------------+
        |                   ^
        v                   |
+-------------------------------------------------------+
|  [ Data / Storage Layer ]                             |
|   - IndexedDB (File Chunks, Metadata)                 |
|   - Cache API (App Shell, Assets)                     |
|   - File System Access API (Streaming Writes)         |
+-------------------------------------------------------+
```

---

## 3. P2P Subsystem (AirShare)

The core innovation of TechBros is its peer-to-peer file sharing engine. It supports two modes: **Online** (Signaling Server) and **Offline** (Manual/QR).

### 3.1 Data Flow: File Transfer

We use a streaming architecture to handle large files (e.g., 500MB videos) on mobile devices with limited RAM.

```ascii
[ SENDER ]                               [ RECEIVER ]
   |                                          |
(File Input)                                  |
   |                                          |
[ Slice Chunk (64KB) ]                        |
   |                                          |
   v                                          |
(WebRTC DataChannel) ---------------------> (Buffer)
                                              |
                                     [ Backpressure Check ]
                                              |
                                     (BufferedAmountLow ?)
                                              |
                                              v
                                     [ Batch Buffer (50 Chunks) ]
                                              |
                                              v
                                     [ IndexedDB / FileHandle ]
```

### 3.2 Optimization Strategies

*   **No Busy-Waiting:** The sender utilizes the `bufferedamountlow` event listener to pause sending when the network buffer is full, ensuring smooth transmission without freezing the main thread.
*   **Batch Writes:** The receiver groups incoming chunks into batches (approx 3MB) before writing to disk/DB. This significantly reduces the overhead of database transactions.
*   **Connection Caching:** The IndexedDB wrapper (`db.js`) keeps the database connection open to avoid the cost of opening/closing it for every write.

---

## 4. State Management

The application state is managed by a centralized `Store` singleton (`src/store.js`).

*   **Resources:** Loaded from `resources.json` into memory.
*   **Settings:** Persisted in `localStorage`.
*   **Search:** Offloaded to a Web Worker (`src/search-worker.js`) to prevent UI jank during fuzzy searches on large datasets.

---

## 5. Security Model

*   **CSP:** Strict Content Security Policy prevents XSS and restricts external connections to known signaling servers.
*   **Sanitization:** All user-generated content (file names) is sanitized before rendering.
*   **Origin Isolation:** The app is designed to work within the secure context (`https://`) required for Service Workers and WebRTC.

---

## 6. Directory Structure

```
/
├── public/             # Static Assets (Manifest, Icons, Resources)
├── src/
│   ├── ui/             # UI Components (Renderers, Event Handlers)
│   ├── app.js          # Entry Point
│   ├── db.js           # IndexedDB Wrapper
│   ├── p2p.js          # WebRTC Logic
│   ├── store.js        # State Manager
│   └── style.css       # Global Styles
├── scripts/            # Build & Maintenance Scripts
└── tests/              # Jest Unit Tests
```
