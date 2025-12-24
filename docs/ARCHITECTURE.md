# TechBros Library: Architecture & Design Documentation

**Version:** 1.1.0  
**Last Updated:** December 2025  
**Author:** Collins Mwangi

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Technology Stack & Rationale](#technology-stack--rationale)
4. [Core Components Deep Dive](#core-components-deep-dive)
5. [Data Flow & State Management](#data-flow--state-management)
6. [Security Architecture](#security-architecture)
7. [Testing Architecture](#testing-architecture)
8. [Build & Deployment Architecture](#build--deployment-architecture)
9. [Future Considerations & Optimizations](#future-considerations--optimizations)

---

## Executive Summary

**TechBros Library** is an offline-first Progressive Web Application designed to democratize access to educational resources in bandwidth-constrained environments. The application employs a hybrid architecture combining static site generation with peer-to-peer file sharing capabilities, enhanced with modern build tools and comprehensive testing.

### Design Philosophy

Our architectural decisions are guided by three core principles:

1. **Simplicity Over Complexity** - Vanilla JavaScript over heavy frameworks.
2. **Offline-First Mindset** - Network is an enhancement, not a requirement.
3. **Zero-Cost Operation** - No backend servers, databases, or hosting fees.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    PRESENTATION LAYER                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ Sidebar  │  │  Search  │  │  Viewer  │  │ Settings │  │ │
│  │  │   Nav    │  │  Filter  │  │   PDFs   │  │  Export  │  │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │ │
│  └───────┼─────────────┼─────────────┼─────────────┼─────────┘ │
│          │             │             │             │            │
│  ┌───────▼─────────────▼─────────────▼─────────────▼─────────┐ │
│  │              APPLICATION CORE (app.js)                     │ │
│  │   ┌─────────────┐  ┌─────────────┐  ┌──────────────┐     │ │
│  │   │   Store     │  │     UI      │  │     P2P      │     │ │
│  │   │ (store.js)  │  │   (ui.js)   │  │   (p2p.js)   │     │ │
│  │   └─────────────┘  └─────────────┘  └──────────────┘     │ │
│  └───────┬─────────────────┬──────────────────┬──────────────┘ │
│          │                 │                  │                 │
│  ┌───────▼─────────────────▼──────────────────▼──────────────┐  │
│  │                 STORAGE & CACHE LAYER                    │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │  │
│  │  │LocalStorage│  │resources.js│  │  Service Worker  │   │  │
│  │  │ (Settings) │  │(Index DB)  │  │  (Cache API)     │   │  │
│  │  └────────────┘  └────────────┘  └──────────────────┘   │  │
│  └──────────┬───────────────────────────────┬───────────────┘  │
└─────────────┼───────────────────────────────┼──────────────────┘
              │                               │
         ┌────▼────┐                    ┌─────▼──────┐
         │  P2P    │                    │   HTTP     │
         │ WebRTC  │                    │   Fetch    │
         │(PeerJS) │                    │(Resources) │
         └────┬────┘                    └─────┬──────┘
              │                               │
         ┌────▼────┐                    ┌─────▼──────┐
         │  Other  │                    │ Cloudflare │
         │ Device  │                    │   Pages    │
         └─────────┘                    └────────────┘
```

---

## Technology Stack & Rationale

### Core Technologies

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Runtime** | Vanilla JavaScript (ES6+) | Zero dependencies, maximum performance, universal compatibility |
| **Build System** | Vite | Fast development server, optimized production builds, modern bundling |
| **Testing** | Jest + jsdom | Comprehensive unit testing, DOM simulation, zero-config setup |
| **P2P** | PeerJS | WebRTC abstraction, reliable file transfers, cross-browser support |
| **PDF Viewer** | PDF.js | Client-side PDF rendering, offline capability, security |
| **Styling** | CSS3 + CSS Variables | Responsive design, theming support, performance |
| **Caching** | Service Worker API | Offline-first functionality, advanced caching strategies |

### Why Vanilla JavaScript?

**Decision:** No React, Vue, or Angular

**Reasoning:**
- **Bundle Size:** Framework overhead adds 50-300KB+ (critical on 2G networks).
- **Longevity:** Vanilla JS has no deprecation cycles or breaking changes.
- **Performance:** Direct DOM manipulation is faster for our use case.
- **Simplicity:** No build step complexity in production (though Vite used for development).

---

## Core Components Deep Dive

### 1. Application Structure (Modularized)

*   **`app.js`**: The entry point. Initializes the Store, UI, and P2P modules and registers the Service Worker.
*   **`js/store.js`**: Manages state (resources list, user settings). Implements fuzzy search using Levenshtein Distance.
*   **`js/ui.js`**: Handles all DOM manipulation, view routing, event listeners, and XSS sanitization.
*   **`js/p2p.js`**: Wraps PeerJS to handle WebRTC connections and chunked file transfers with progress tracking.

### 2. Fuzzy Search Engine

**Location:** `js/store.js`

**Algorithm:** Levenshtein Distance with optimizations.

**Features:**
- **Typo Tolerance:** "Calculs" matches "Calculus".
- **Performance:** Cached results for common queries.
- **Relevance:** Results filtered by edit distance threshold.

### 3. P2P File Transfer Protocol

**Location:** `js/p2p.js` & `js/ui.js`

**Enhanced Features:**
1.  **Identity:** Each user gets a 4-digit PIN.
2.  **Handshake:** Sender enters Receiver's PIN to establish WebRTC connection.
3.  **Chunked Transfer:** Large files split into 64KB chunks for reliability.
4.  **Progress Tracking:** Real-time transfer progress with visual indicators.
5.  **Error Recovery:** Automatic retry on chunk failures.
6.  **Security:** MIME type validation and executable file blocking.

**Workflow:**
1. Sender selects file and generates PIN
2. Receiver enters PIN to connect
3. File is chunked and transferred with progress updates
4. Receiver reassembles chunks and saves file

---

## Data Flow & State Management

### State Architecture

```
User Action → UI Event → Store Update → UI Re-render → DOM Update
     ↓              ↓         ↓            ↓            ↓
  Click        Event         State       Virtual      Browser
  Search       Handler      Change       DOM         Display
```

### Data Persistence

- **Settings:** LocalStorage (theme, search preferences)
- **Resources:** IndexedDB via resources.json (library index)
- **Cache:** Service Worker Cache API (PDFs, assets)

---

## Security Architecture

### Threat Model & Defense

1.  **XSS via User Input:**
    *   **Defense:** All dynamic content sanitized through `ui._sanitize()`.

2.  **Malicious File Uploads:**
    *   **Defense:** P2P module validates MIME types, blocks executables.

3.  **Stale Content:**
    *   **Defense:** Network-first strategy for `resources.json`.

4.  **WebRTC Security:**
    *   **Defense:** PIN-based authentication, file type validation.

---

## Testing Architecture

### Test Framework: Jest + jsdom

**Coverage Areas:**
- Store functionality (search, settings, state management)
- UI components (DOM manipulation, event handling)
- P2P module (connection, file transfer simulation)
- Utility functions (sanitization, validation)

**Test Structure:**
```
tests/
├── store.test.js      # State management tests
├── ui.test.js         # DOM manipulation tests
├── p2p.test.js        # P2P functionality tests
└── utils.test.js      # Helper function tests
```

**CI/CD Integration:**
- Automated test runs on commits
- Coverage reporting
- Pre-deployment validation

---

## Build & Deployment Architecture

### Development Workflow

```bash
# Development server (Vite)
npm run dev:vite

# Testing
npm test

# Production build
npm run build
```

### Build System: Vite

**Features:**
- **Fast HMR:** Instant updates during development
- **Optimized Builds:** Code splitting, minification, asset optimization
- **ES Module Support:** Native module loading in modern browsers

### Deployment: Cloudflare Pages

**Strategy:**
- **Global CDN:** Served from 300+ edge locations
- **Atomic Deploys:** `git push` triggers automated build
- **Zero Config:** Static site deployment with no server management

**Deployment Command:**
```bash
npm run deploy
# OR
npx wrangler pages deploy dist --project-name techbros
```

---

## Executive Summary

**TechBros Library** is an offline-first Progressive Web Application designed to democratize access to educational resources in bandwidth-constrained environments. The application employs a hybrid architecture combining static site generation with peer-to-peer file sharing capabilities.

### Design Philosophy

Our architectural decisions are guided by three core principles:

1. **Simplicity Over Complexity** - Vanilla JavaScript over heavy frameworks.
2. **Offline-First Mindset** - Network is an enhancement, not a requirement.
3. **Zero-Cost Operation** - No backend servers, databases, or hosting fees.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    PRESENTATION LAYER                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ Sidebar  │  │  Search  │  │  Viewer  │  │ Settings │  │ │
│  │  │   Nav    │  │  Filter  │  │   PDFs   │  │  Export  │  │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │ │
│  └───────┼─────────────┼─────────────┼─────────────┼─────────┘ │
│          │             │             │             │            │
│  ┌───────▼─────────────▼─────────────▼─────────────▼─────────┐ │
│  │              APPLICATION CORE (app.js)                     │ │
│  │   ┌─────────────┐  ┌─────────────┐  ┌──────────────┐     │ │
│  │   │   Store     │  │     UI      │  │     P2P      │     │ │
│  │   │ (store.js)  │  │   (ui.js)   │  │   (p2p.js)   │     │ │
│  │   └─────────────┘  └─────────────┘  └──────────────┘     │ │
│  └───────┬─────────────────┬──────────────────┬──────────────┘ │
│          │                 │                  │                 │
│  ┌───────▼─────────────────▼──────────────────▼──────────────┐  │
│  │                 STORAGE & CACHE LAYER                    │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │  │
│  │  │LocalStorage│  │resources.js│  │  Service Worker  │   │  │
│  │  │ (Settings) │  │(Index DB)  │  │  (Cache API)     │   │  │
│  │  └────────────┘  └────────────┘  └──────────────────┘   │  │
│  └──────────┬───────────────────────────────┬───────────────┘  │
└─────────────┼───────────────────────────────┼──────────────────┘
              │                               │
         ┌────▼────┐                    ┌─────▼──────┐
         │  P2P    │                    │   HTTP     │
         │ WebRTC  │                    │   Fetch    │
         │(PeerJS) │                    │(Resources) │
         └────┬────┘                    └─────┬──────┘
              │                               │
         ┌────▼────┐                    ┌─────▼──────┐
         │  Other  │                    │ Cloudflare │
         │ Device  │                    │   Pages    │
         └─────────┘                    └────────────┘
```

---

## Technology Stack & Rationale

### Why Vanilla JavaScript?

**Decision:** No React, Vue, or Angular

**Reasoning:**
- **Bundle Size:** Framework overhead adds 50-300KB+ (critical on 2G networks).
- **Longevity:** Vanilla JS has no deprecation cycles or breaking changes.
- **Performance:** Direct DOM manipulation is faster for our use case.
- **Simplicity:** No build step, transpilation, or toolchain complexity.

---

## Core Components Deep Dive

### 1. Application Structure (Modularized)

*   **`app.js`**: The entry point. Initializes the Store, UI, and P2P modules and registers the Service Worker.
*   **`js/store.js`**: Manages state (resources list, user settings). Implements the Fuzzy Search algorithm (Levenshtein Distance).
*   **`js/ui.js`**: Handles all DOM manipulation, view routing, event listeners, and XSS sanitization.
*   **`js/p2p.js`**: Wraps PeerJS to handle WebRTC connections and file transfers.

### 2. Fuzzy Search Engine

**Location:** `js/store.js`

**Algorithm:** Levenshtein Distance.

**Why Levenshtein:**
- **Typo Tolerance:** "Calculs" matches "Calculus".
- **Relevance:** Results are filtered based on edit distance, ensuring users find what they need even with spelling errors.

### 3. P2P File Transfer Protocol

**Location:** `js/p2p.js` & `js/ui.js`

**Workflow:**
1.  **Identity:** Each user gets a 4-digit PIN.
2.  **Handshake:** Sender enters Receiver's PIN to establish a WebRTC connection via PeerJS.
3.  **Transfer:** File is sent as a Blob.
4.  **Reception:** Receiver gets a notification and must manually click "Save to Device" (Browser security requirement).

---

## Security Architecture

### Threat Model & Defense

1.  **XSS via User Input:**
    *   **Defense:** All dynamic content (titles, filenames) is passed through `ui._sanitize()`, which escapes HTML characters before rendering.
2.  **Malicious File Uploads:**
    *   **Defense:** P2P module validates MIME types and blocks executables (`.exe`, `.js`, etc.).
3.  **Stale Content:**
    *   **Defense:** Service Worker uses a "Network-First" strategy for `resources.json`, ensuring the library index is always up-to-date.

---

## Deployment Architecture

### Cloudflare Pages

**Strategy:**
- **Global CDN:** served from 300+ edge locations.
- **Atomic Deploys:** `git push` triggers a build.
- **Wrangler:** CLI tool used for manual deployments.

**Command:**
```bash
npx wrangler pages deploy public --project-name techbros
```

---

## Future Considerations & Optimizations

### Performance Optimizations

#### P2P File Transfer Memory Management
**Current Issue:** The P2P file transfer system (`p2p.js`) reconstructs entire files in memory using `new Blob(fileData.chunks)`, which can cause browser crashes on low-end mobile devices when transferring large files (e.g., 1GB+).

**Technical Details:**
- **Problem Code:** `fileData.chunks[data.index] = data.data;` followed by `new Blob(fileData.chunks, { type: fileData.mime })`
- **Impact:** Full file size held in RAM during transfer
- **Affected Devices:** Low-end mobile devices, tablets with limited RAM

**Proposed Solutions:**
1. **File System Access API:** Write chunks directly to disk instead of memory
   - **Pros:** Zero memory overhead, handles any file size
   - **Cons:** Requires user permission, limited browser support
   - **Implementation:** Use `showSaveFilePicker()` and `FileSystemWritableFileStream`

2. **Stream Processing:** Process files as streams rather than complete blobs
   - **Pros:** Constant memory usage regardless of file size
   - **Cons:** Complex implementation, requires protocol changes
   - **Implementation:** Use `TransformStream` and `ReadableStream`

3. **Progressive Blob Construction:** Build blob incrementally without full memory allocation
   - **Pros:** Simpler implementation, maintains current protocol
   - **Cons:** Still limited by available RAM
   - **Implementation:** Use `Blob` constructor with smaller chunk arrays

**Priority:** High (affects production stability)
**Estimated Effort:** Medium-High
**Timeline:** Future release (post-MVP)

### Additional Future Enhancements

#### Search Performance
- **Current:** Fuzzy search runs in main thread
- **Future:** WebAssembly implementation for faster string matching

#### Storage Optimization
- **Current:** LocalStorage for settings, Cache API for resources
- **Future:** IndexedDB for better performance and larger data sets

#### P2P Reliability
- **Current:** Basic WebRTC with STUN servers
- **Future:** TURN server support for firewall traversal, connection quality monitoring

---

**Document Version:** 1.1.0  
**Last Updated:** December 2025
