# Technical Architecture

**Project:** TechBros Library  
**Version:** 3.0.0  
**Author:** Collins Mwangi  
**Last Updated:** 4 February 2026

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architectural Principles](#2-architectural-principles)
3. [System Architecture](#3-system-architecture)
4. [Data Flow](#4-data-flow)
5. [Core Subsystems](#5-core-subsystems)
6. [Storage Layer](#6-storage-layer)
7. [Network Architecture](#7-network-architecture)
8. [Security Model](#8-security-model)
9. [Performance Optimizations](#9-performance-optimizations)
10. [Directory Structure](#10-directory-structure)
11. [Build and Deployment](#11-build-and-deployment)

---

## 1. System Overview

TechBros Library is a client-centric Progressive Web Application designed for educational resource distribution in bandwidth-constrained environments. The system operates on a hybrid architecture combining static site delivery with serverless edge computing and peer-to-peer data transfer.

### Design Constraints

- **Network Unreliability:** Assumes intermittent or absent internet connectivity
- **Device Limitations:** Targets devices with limited RAM (2-4GB) and storage
- **Data Conservation:** Minimizes cloud bandwidth through peer-to-peer distribution
- **Platform Diversity:** Runs on mobile, tablet, and desktop browsers

### Technology Stack

**Frontend Runtime:**
- Vanilla JavaScript (ES2020+)
- Service Worker API
- IndexedDB API
- WebRTC DataChannel
- File System Access API

**Build System:**
- Vite 7.3.1 (bundler and dev server)
- Babel 7.29.0 (JavaScript transpilation)
- ESLint 9.39.2 (code linting)

**Testing:**
- Jest 30.2.0 (unit testing framework)
- JSDOM 30.2.0 (DOM simulation)

**Cloud Infrastructure:**
- Cloudflare Pages (static hosting)
- Cloudflare Workers (serverless functions)
- Cloudflare R2 (object storage)

**External Dependencies:**
- PeerJS 1.5.4 (WebRTC abstraction)
- PDF.js 5.4.624 (PDF rendering)
- Phosphor Icons 2.1.1 (UI iconography)
- QRCode.js 1.0.0 (QR code generation)
- music-metadata 11.11.2 (audio metadata extraction)

---

## 2. Architectural Principles

### 2.1 Offline-First Design

The application prioritizes local functionality over network-dependent features. All core operations (browsing, viewing, searching) function without internet access.

```
Network Availability Spectrum:
┌────────────────────────────────────────────────────────┐
│ Offline          │ Online (Degraded)  │ Online (Full)  │
├──────────────────┼────────────────────┼────────────────┤
│ Browse Library   │ Sync Resources     │ Cloud Upload   │
│ Search Content   │ P2P with Signaling │ R2 Download    │
│ View Files       │ Background Sync    │ List Refresh   │
│ P2P (Manual)     │                    │                │
└────────────────────────────────────────────────────────┘
```

### 2.2 Progressive Enhancement

Features degrade gracefully based on browser capability and network conditions:

1. **Baseline:** Static HTML/CSS rendering
2. **Enhanced:** JavaScript interactivity and routing
3. **Advanced:** Service Worker caching and background sync
4. **Premium:** WebRTC peer-to-peer transfer

### 2.3 Client-Heavy Architecture

Business logic resides in the browser to minimize server dependency. The server's role is reduced to:
- Static asset delivery
- Resource metadata catalog
- WebRTC signaling coordination
- Object storage proxy

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER RUNTIME                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                     UI LAYER                              │ │
│  │  ┌────────────┐  ┌──────────┐  ┌────────────────────┐   │ │
│  │  │  Router    │  │ Library  │  │  Viewer (PDF/AV)   │   │ │
│  │  │ (SPA Nav)  │  │  (Grid)  │  │   + Controls       │   │ │
│  │  └────────────┘  └──────────┘  └────────────────────┘   │ │
│  │  ┌────────────┐  ┌──────────┐  ┌────────────────────┐   │ │
│  │  │  P2P UI    │  │  Search  │  │  Settings Dialog   │   │ │
│  │  │ (QR/Chat)  │  │   Bar    │  │  (Theme/Prefs)     │   │ │
│  │  └────────────┘  └──────────┘  └────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  BUSINESS LOGIC LAYER                     │ │
│  │  ┌────────────┐  ┌──────────┐  ┌────────────────────┐   │ │
│  │  │   Store    │  │   P2P    │  │  Error Handler     │   │ │
│  │  │  (State)   │  │ Service  │  │   (Centralized)    │   │ │
│  │  └────────────┘  └──────────┘  └────────────────────┘   │ │
│  │  ┌────────────┐  ┌──────────┐  ┌────────────────────┐   │ │
│  │  │ PDF Viewer │  │  Security│  │  Integrity Check   │   │ │
│  │  │  Engine    │  │ Sanitizer│  │  (File Hash)       │   │ │
│  │  └────────────┘  └──────────┘  └────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   STORAGE LAYER                           │ │
│  │  ┌──────────────────┐  ┌─────────────────────────────┐   │ │
│  │  │   IndexedDB      │  │      Cache API              │   │ │
│  │  │  ┌────────────┐  │  │  ┌─────────────────────┐   │   │ │
│  │  │  │  Chunks    │  │  │  │  App Shell (HTML)   │   │   │ │
│  │  │  │  Metadata  │  │  │  │  Assets (CSS/JS)    │   │   │ │
│  │  │  │  Transfers │  │  │  │  Vendor Libraries   │   │   │ │
│  │  │  └────────────┘  │  │  └─────────────────────┘   │   │ │
│  │  └──────────────────┘  └─────────────────────────────┘   │ │
│  │  ┌──────────────────┐  ┌─────────────────────────────┐   │ │
│  │  │  localStorage    │  │  File System Access API     │   │ │
│  │  │  (Settings)      │  │  (Download Streaming)       │   │ │
│  │  └──────────────────┘  └─────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
        ┌─────────────────┐       ┌──────────────────┐
        │  WebRTC Peers   │       │  Cloudflare Edge │
        │  (P2P Network)  │       │    (Optional)    │
        └─────────────────┘       └──────────────────┘
```

### 3.2 Component Interaction Flow

```
User Action (Click/Touch)
    │
    ▼
┌─────────────────────┐
│  UI Event Handler   │  (ui/library.js, ui/viewer.js, etc.)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Router            │  (ui/router.js - URL state management)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Store (State)     │  (store.js - centralized state)
└──────────┬──────────┘
           │
           ├─────────────────┬────────────────┬──────────────┐
           ▼                 ▼                ▼              ▼
    ┌───────────┐   ┌──────────────┐   ┌─────────┐   ┌──────────┐
    │ IndexedDB │   │  P2P Service │   │  Fetch  │   │ UI Update│
    │  (db.js)  │   │   (p2p.js)   │   │   API   │   │  (DOM)   │
    └───────────┘   └──────────────┘   └─────────┘   └──────────┘
```

---

## 4. Data Flow

### 4.1 Application Initialization

```
Browser Loads URL (techbros.pages.dev)
    │
    ▼
Service Worker Intercepts Request
    │
    ├─ Cache Hit? ──YES──> Return Cached Response
    │                               │
    NO                              │
    │                               │
    ▼                               │
Fetch from Network                  │
    │                               │
    ▼                               │
Cache Response + Return         ◄───┘
    │
    ▼
HTML Parsed → Execute theme-init.js (prevent FOUC)
    │
    ▼
Load app.js (Entry Point)
    │
    ▼
┌────────────────────────────────────────────┐
│ Initialize Core Modules:                   │
│  1. Store (state management)               │
│  2. P2P Service (WebRTC setup)             │
│  3. Router (history API)                   │
│  4. UI Manager (event delegation)          │
└────────────────────────────────────────────┘
    │
    ▼
Load Resources:
├─ localStorage (settings, theme)
├─ IndexedDB (cached files, ongoing transfers)
├─ /resources.json (metadata catalog)
└─ /api/list (cloud resources if online)
    │
    ▼
Render Initial View (Library Grid)
```

### 4.2 File Download Flow (Cloud)

```
User Clicks "Download" on Cloud Resource
    │
    ▼
Store.downloadResource(url)
    │
    ├─ Check if already in IndexedDB ──YES──> Open from Local
    │                                                   │
    NO                                                  │
    │                                                   │
    ▼                                                   │
Fetch with Progress Tracking                            │
    │                                                   │
    ├─ Stream Response Body                             │
    ├─ Read Chunks (256KB)                              │
    ├─ Update Progress UI                               │
    └─ Write to IndexedDB                               │
            │                                           │
            ▼                                           │
Extraction (if needed):                                 │
├─ PDF Metadata (pdf-lib)                               │
├─ Audio Metadata (music-metadata)                      │
└─ Generate Cover Image                                 │
            │                                           │
            ▼                                           │
Update Store State (resource now local)                 │
            │                                           │
            └──────────────────────────────────────────►┘
                            │
                            ▼
                    Open Viewer
```

### 4.3 P2P Transfer Flow

```
SENDER                                          RECEIVER
  │                                                │
  │ 1. User Clicks "Share via QR"                  │
  │                                                │
  ▼                                                │
Generate QR Code with Offer SDP                    │
  │                                                │
  │◄───────────────QR SCAN─────────────────────────┤
  │                                                │
  │                                           Decode QR
  │                                           Create Answer SDP
  │                                                │
  │◄────────────ANSWER (Manual Copy)──────────────┤
  │                                                │
Paste Answer → Establish WebRTC Connection         │
  │                                                │
  │═══════════════ DATACHANNEL OPEN ═══════════════│
  │                                                │
Send File Metadata (name, size, mime, chunks)      │
  │──────────────────────────────────────────────►│
  │                                          Create Transfer Entry
  │                                          Allocate Buffer
  │                                                │
Loop (for each chunk):                             │
  ├─ Read 64KB chunk                               │
  ├─ Send via DataChannel                          │
  │──────────────────────────────────────────────►│
  │                                          Receive Chunk
  │                                          Buffer Chunk
  │                                          (Every 50 chunks)
  │                                          Batch Write to IndexedDB
  │                                          Update Progress
  │                                                │
  │◄──────────────ACK (bufferedamountlow)─────────┤
  │                                                │
Continue Sending                                   │
  │                                                │
  │──────────────── FINAL CHUNK ──────────────────►│
  │                                          Flush Buffer
  │                                          Write Remaining Chunks
  │                                          Mark Complete
  │                                                │
  │◄──────────────── COMPLETE ────────────────────┤
  │                                                │
Close DataChannel                              Close DataChannel
```

---

## 5. Core Subsystems

### 5.1 P2P Service (p2p.js)

The P2P subsystem enables direct file transfer between browsers using WebRTC DataChannel. It supports two modes:

**Online Mode:** Uses PeerJS cloud signaling server for automatic peer discovery.  
**Offline Mode:** Uses QR codes to exchange SDP offers/answers manually.

#### Key Features

- **Chunked Transfer:** Files split into 64KB chunks to avoid memory exhaustion
- **Backpressure Handling:** Monitors `bufferedAmount` and pauses sending when channel is congested
- **Resume Support:** Interrupted transfers can resume from last received chunk
- **Integrity Verification:** SHA-256 hash validation on completion
- **Real-time Chat:** Text messaging over the same DataChannel

#### Data Protocol

All messages are JSON-encoded strings sent over the DataChannel:

```javascript
// File Transfer Initiation
{
  "type": "meta",
  "transferId": "file.pdf-1234567890-1738627200",
  "name": "lecture_notes.pdf",
  "size": 10485760,
  "mime": "application/pdf",
  "totalChunks": 160,
  "hash": "a3f5b9c..."
}

// File Chunk
{
  "type": "chunk",
  "transferId": "file.pdf-1234567890-1738627200",
  "index": 42,
  "data": "base64encodeddata..."
}

// Progress Acknowledgment
{
  "type": "progress",
  "transferId": "file.pdf-1234567890-1738627200",
  "received": 42
}

// Transfer Complete
{
  "type": "complete",
  "transferId": "file.pdf-1234567890-1738627200"
}

// Chat Message
{
  "type": "chat",
  "text": "Transfer starting now",
  "timestamp": 1738627200
}
```

#### Optimization: Batch Writes

The receiver buffers incoming chunks and writes them to IndexedDB in batches of 50 chunks (approximately 3.2MB) to reduce transaction overhead:

```
Receive Chunk → Buffer (Array)
                    │
               (Count % 50 == 0?)
                    │
                   YES
                    │
                    ▼
            Batch Write to IDB
            Clear Buffer
```

### 5.2 Store (store.js)

Centralized state management singleton. All components read and modify state through the Store API.

**State Structure:**

```javascript
{
  resources: Array,        // Combined local + cloud resources
  activeView: String,      // 'library' | 'viewer' | 'p2p'
  currentResource: Object, // Currently open file
  searchQuery: String,
  settings: {
    theme: 'dark' | 'light',
    listView: Boolean,
    qrShareMode: 'online' | 'offline'
  }
}
```

**Key Methods:**

- `init()`: Load resources from IndexedDB, localStorage, and network
- `loadResource(id)`: Fetch file blob and metadata
- `downloadResource(url)`: Stream download with progress tracking
- `deleteResource(id)`: Remove from IndexedDB
- `search(query)`: Offload to Web Worker for fuzzy matching

### 5.3 Database Wrapper (db.js)

Thin abstraction layer over IndexedDB with automatic connection management.

**Object Stores:**

1. **resources**: Metadata (id, title, type, size, date, hash)
2. **chunks**: Raw file data (id, chunkIndex, data)
3. **transfers**: P2P transfer state (id, progress, status)

**Connection Pooling:**

The database connection remains open after initialization to avoid the overhead of repeated `indexedDB.open()` calls:

```javascript
let dbConnection = null;

export const db = {
  async init() {
    if (dbConnection) return dbConnection;
    dbConnection = await openDB('TechBros', 3);
    return dbConnection;
  },
  
  async getChunks(resourceId) {
    const db = await this.init();
    return db.getAll('chunks', IDBKeyRange.bound([resourceId, 0], [resourceId, Infinity]));
  }
};
```

### 5.4 PDF Viewer (pdf-viewer.js)

Dedicated PDF rendering component using PDF.js. Features include:

- Page navigation (prev/next)
- Zoom controls (50%-200%)
- Canvas-based rendering
- Lazy page loading (render on-demand)
- Error handling for corrupted PDFs

**Rendering Pipeline:**

```
Load PDF Document (PDFDocument.getDocument)
    │
    ▼
Get Page (doc.getPage(pageNum))
    │
    ▼
Calculate Viewport (page.getViewport(scale))
    │
    ▼
Render to Canvas (page.render({ canvasContext, viewport }))
    │
    ▼
Display Canvas in DOM
```

### 5.5 Service Worker (public/sw.js)

Handles offline functionality and aggressive caching strategy.

**Cache Layers:**

1. **App Cache (v3.0.0):** Critical shell assets (HTML, CSS, JS)
2. **Resource Cache:** Downloaded files (LRU eviction after 50 items)

**Fetch Strategy:**

```
Fetch Event Intercepted
    │
    ├─ API Request (/api/*)? ──YES──> Network Only
    │                                      │
    NO                                  (Cache on Success)
    │                                      │
    ▼                                      │
Cache First Strategy                       │
    │                                      │
    ├─ Check Cache ──HIT──> Return     ◄──┘
    │                           │
    MISS                        │
    │                           │
    ▼                           │
Fetch from Network              │
    │                           │
    ├─ Success? ──YES──> Cache + Return
    │                               
    NO                              
    │                               
    ▼                               
Return 404 Page (Offline Fallback)
```

---

## 6. Storage Layer

### 6.1 IndexedDB Schema

**Database Name:** `TechBros`  
**Version:** 3

**Object Store: resources**
```
{
  keyPath: 'id',
  indexes: ['type', 'title', 'date'],
  data: {
    id: String,           // Unique identifier
    title: String,        // Display name
    type: String,         // 'pdf' | 'audio' | 'video' | 'image' | 'archive'
    size: Number,         // File size in bytes
    mime: String,         // MIME type
    date: Timestamp,      // Added/modified date
    cover: String,        // Base64 cover image or URL
    hash: String,         // SHA-256 integrity hash
    isLocal: Boolean,     // Stored locally
    isCloud: Boolean      // Available in cloud
  }
}
```

**Object Store: chunks**
```
{
  keyPath: ['resourceId', 'index'],
  data: {
    resourceId: String,
    index: Number,
    data: ArrayBuffer
  }
}
```

**Object Store: transfers**
```
{
  keyPath: 'id',
  data: {
    id: String,               // transferId
    resourceId: String,       // Associated resource
    direction: 'send' | 'receive',
    progress: Number,         // 0-100
    status: 'pending' | 'active' | 'paused' | 'complete' | 'error',
    chunksReceived: Array,    // Bitmap of received chunks
    totalChunks: Number,
    peerName: String
  }
}
```

### 6.2 Storage Quota Management

The application monitors storage usage and implements eviction policies:

```javascript
// Check available storage
const estimate = await navigator.storage.estimate();
const usagePercent = (estimate.usage / estimate.quota) * 100;

// Trigger cleanup if > 80% full
if (usagePercent > 80) {
  await db.evictOldResources({ maxAge: 30 * 86400 * 1000 }); // 30 days
}
```

---

## 7. Network Architecture

### 7.1 Cloud Infrastructure (Cloudflare)

**Deployment Model:** JAMstack (JavaScript + APIs + Markup)

```
┌────────────────────────────────────────────────────────┐
│                  Cloudflare Global Network              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Cloudflare Pages (CDN)                │  │
│  │  • Static Asset Delivery (HTML, CSS, JS)        │  │
│  │  • Automatic HTTPS                               │  │
│  │  • Global Edge Caching                           │  │
│  │  • DDoS Protection                               │  │
│  └──────────────────────────────────────────────────┘  │
│                       │                                 │
│                       ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Cloudflare Workers (Functions)           │  │
│  │  /functions/api/list.js    (GET)                 │  │
│  │  /functions/api/upload.js  (POST)                │  │
│  │  /functions/cdn/[[path]].js (Proxy to R2)       │  │
│  └──────────────────────────────────────────────────┘  │
│                       │                                 │
│                       ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Cloudflare R2 (Object Storage)         │  │
│  │  Bucket: techbros-uploads                        │  │
│  │  • File Storage                                  │  │
│  │  • No Egress Fees                                │  │
│  │  • S3-Compatible API                             │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 7.2 API Endpoints

**GET /api/list**
- Lists all files in R2 bucket
- Returns JSON array of resource metadata
- Automatically detects cover images (*.cover.jpg)

**POST /api/upload**
- Multipart file upload to R2
- Validates file type and size
- Generates unique IDs

**GET /cdn/:path**
- Proxies requests to R2 bucket
- Sets appropriate Content-Type headers
- Enables browser caching

### 7.3 WebRTC Signaling

**PeerJS Cloud (Default):**
- Free signaling server at peerjs.com
- Used for online P2P mode
- Handles peer discovery and SDP exchange

**Manual Signaling (Offline Mode):**
- QR codes encode WebRTC offer SDP
- User manually copies answer SDP
- No server dependency

---

## 8. Security Model

### 8.1 Content Security Policy

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  media-src 'self' blob:;
  connect-src 'self' https://*.peerjs.com wss://*.peerjs.com;
  worker-src 'self';
  font-src 'self';
```

### 8.2 Input Sanitization

All user-provided data is sanitized before rendering:

```javascript
// security.js
export function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .substring(0, 255);
}

export function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

### 8.3 File Integrity Verification

All downloaded files are hashed and verified:

```javascript
// integrity.js
export async function verifyFile(blob, expectedHash) {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === expectedHash;
}
```

---

## 9. Performance Optimizations

### 9.1 Code Splitting

Vite automatically splits the application into chunks:

- **app.js:** Core application logic
- **pdf-viewer.js:** Lazy-loaded when PDF opened
- **p2p.js:** Lazy-loaded when P2P feature used
- **vendor.js:** Third-party libraries (PeerJS, PDF.js)

### 9.2 Lazy Loading

Large assets are loaded on-demand:

```javascript
// Defer PeerJS until P2P mode activated
async function initP2P() {
  if (!window.Peer) {
    await import('/vendor/peerjs.min.js');
  }
  return new P2PService();
}
```

### 9.3 Virtual Scrolling

Library view implements virtual scrolling for large collections:

```javascript
// Only render visible items + buffer
const startIndex = Math.floor(scrollTop / itemHeight) - bufferSize;
const endIndex = startIndex + visibleCount + (bufferSize * 2);
const visibleResources = allResources.slice(startIndex, endIndex);
```

### 9.4 Web Worker Offloading

Search operations run in a dedicated worker to prevent main thread blocking:

```javascript
// search-worker.js
self.addEventListener('message', (e) => {
  const { query, resources } = e.data;
  const results = fuzzySearch(query, resources);
  self.postMessage(results);
});
```

---

## 10. Directory Structure

```
techbros/
├── public/                      # Static assets (served as-is)
│   ├── _headers                 # HTTP headers config (Cloudflare)
│   ├── manifest.json            # PWA manifest
│   ├── resources.json           # Local resource catalog
│   ├── robots.txt               # SEO crawling rules
│   ├── sitemap.xml              # SEO sitemap
│   ├── sw.js                    # Service Worker (app shell caching)
│   ├── theme-init.js            # Theme loader (FOUC prevention)
│   ├── favicon.png              # App icon
│   ├── fonts/
│   │   └── inter.css            # Inter font (variable)
│   ├── resources/               # Empty directory (for local testing)
│   └── vendor/
│       ├── peerjs.min.js        # WebRTC library
│       ├── pdf.worker.min.js    # PDF.js worker thread
│       └── phosphor/            # Icon fonts and CSS
│
├── src/                         # Application source code
│   ├── app.js                   # Entry point (initializer)
│   ├── db.js                    # IndexedDB wrapper
│   ├── p2p.js                   # WebRTC P2P service
│   ├── pdf-viewer.js            # PDF rendering engine
│   ├── search-worker.js         # Web Worker for fuzzy search
│   ├── store.js                 # State management (singleton)
│   ├── style.css                # Global styles
│   ├── ui.js                    # UI manager (notifications, modals)
│   ├── ui/
│   │   ├── common.js            # Shared UI utilities (header, theme toggle)
│   │   ├── library.js           # Library grid/list view
│   │   ├── p2p-ui.js            # P2P interface (QR, chat, progress)
│   │   ├── router.js            # SPA routing (History API)
│   │   ├── snow.js              # Easter egg (falling snow effect)
│   │   └── viewer.js            # File viewer (PDF, video, audio, text)
│   └── utils/
│       ├── errorHandler.js      # Centralized error handling
│       ├── integrity.js         # File hashing and verification
│       └── security.js          # Input sanitization
│
├── functions/                   # Cloudflare Workers (serverless)
│   ├── api/
│   │   ├── list.js              # GET /api/list (list R2 objects)
│   │   └── upload.js            # POST /api/upload (upload to R2)
│   └── cdn/
│       └── [[path]].js          # Dynamic route (proxy R2 files)
│
├── scripts/                     # Build and maintenance scripts
│   ├── add_resource.js          # CLI tool to add local resources
│   ├── deploy.js                # Deployment automation
│   ├── update-sw.js             # Service Worker cache versioning
│   └── upload_to_r2.js          # Bulk upload to R2 bucket
│
├── test/                        # Jest unit tests
│   ├── setup.js                 # Test environment configuration
│   ├── store.test.js            # State management tests
│   ├── p2p.test.js              # P2P service tests
│   ├── p2p_idb.test.js          # P2P IndexedDB integration tests
│   ├── p2p_transfer_logic.test.js # P2P transfer logic tests
│   ├── pdf-viewer.test.js       # PDF viewer tests
│   ├── library.test.js          # Library UI tests
│   ├── errorHandler.test.js     # Error handling tests
│   ├── integrity.test.js        # File integrity tests
│   └── upload-integration.test.js # Upload flow tests
│
├── docs/                        # Documentation
│   └── ARCHITECTURE.md          # This file
│
├── index.html                   # Main HTML entry point
├── 404.html                     # Offline fallback page
├── package.json                 # NPM dependencies and scripts
├── package-lock.json            # Dependency lock file
├── vite.config.js               # Vite bundler configuration
├── babel.config.js              # Babel transpilation config
├── jest.config.js               # Jest test configuration
├── eslint.config.js             # ESLint 9 flat config
├── wrangler.toml                # Cloudflare Workers configuration
├── .gitignore                   # Git ignore patterns
├── .env.example                 # Environment variables template
├── LICENSE                      # MIT License
└── README.md                    # Project overview
```

---

## 11. Build and Deployment

### 11.1 Development Workflow

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Run linter
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### 11.2 Production Build

```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

**Build Output (dist/):**
```
dist/
├── index.html              # HTML with inlined critical CSS
├── 404.html                # Offline fallback
├── assets/
│   ├── app-[hash].js       # Main application bundle
│   ├── app-[hash].css      # Extracted CSS
│   └── vendor-[hash].js    # Third-party libraries
├── fonts/                  # Web fonts
├── vendor/                 # Vendor assets (PDF.js, PeerJS)
└── sw.js                   # Service Worker (not hashed)
```

### 11.3 Deployment (Cloudflare Pages)

**Automatic Deployment:**
1. Push to GitHub main branch
2. Cloudflare Pages detects changes
3. Runs build command: `npm run build`
4. Deploys dist/ to global CDN
5. Invalidates edge cache

**Manual Deployment:**
```bash
npm run deploy
# Equivalent to: wrangler pages deploy dist/
```

**Environment Variables:**
- `BUCKET` (R2 binding configured in wrangler.toml)
- `NODE_ENV=production` (set automatically)

---

## Conclusion

TechBros Library demonstrates a modern approach to building resilient, offline-capable web applications. By leveraging browser APIs (Service Worker, IndexedDB, WebRTC) and edge computing (Cloudflare Workers), the system achieves high availability and performance without requiring traditional backend infrastructure.

The architecture prioritizes user experience in constrained environments while maintaining extensibility for future enhancements such as end-to-end encryption, multi-peer transfers, and decentralized resource discovery.

**Key Architectural Strengths:**

1. **Resilience:** Offline-first design ensures functionality without network
2. **Performance:** Client-side rendering and aggressive caching minimize latency
3. **Scalability:** P2P distribution reduces server bandwidth costs
4. **Maintainability:** Modular architecture with clear separation of concerns
5. **Security:** Layered security model with CSP, sanitization, and integrity checks

For implementation details and API documentation, refer to the source code comments and JSDoc annotations throughout the codebase.
