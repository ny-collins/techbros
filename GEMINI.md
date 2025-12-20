# TechBros Library - Gemini Context

## Project Overview

**TechBros Library** is an offline-first Progressive Web Application (PWA) designed to democratize access to educational resources in bandwidth-constrained environments. It allows users to browse, view, and share (via P2P) educational materials like PDFs and videos without needing a continuous internet connection.

*   **Type:** Static Web Application (SPA) / PWA
*   **Core Philosophy:** Simplicity (Vanilla JS), Offline-First, Zero-Cost Operation.
*   **Hosting:** Cloudflare Pages (implied by `.wrangler` configuration).

## Architecture

The project follows a "Static Site with Flat-File Database" architecture.

*   **Frontend:** Vanilla JavaScript (ES6+ Modules), HTML5, CSS3. No build step/bundler for the frontend code itself.
*   **Data:** A static JSON file (`public/resources.json`) acts as the database.
*   **Routing:** Custom hash-based client-side router (e.g., `#library`, `#settings`) implemented in `app.js`.
*   **P2P Layer:** Uses `PeerJS` (WebRTC wrapper) for direct browser-to-browser file sharing using a 4-digit PIN handshake system.
*   **Offline:** Custom Service Worker (`sw.js`) handles caching strategies (Network-First for index, Cache-First for app shell, Cache-on-Demand for large resources).

## Key Directories & Files

### `/public` (The Application)
This directory contains the deployable static site.
*   `index.html`: The single entry point. Contains the app shell and includes external libraries (PeerJS, PDF.js).
*   `app.js`: The "brain" of the application. Handles:
    *   **State Management:** Global state objects (`allResources`, `userSettings`).
    *   **Routing:** Manages view transitions (`navigateToView`).
    *   **P2P Logic:** Implements the sender/receiver flows using PeerJS.
*   `utils.js`: Helper functions for security (XSS sanitization), search (fuzzy matching), and formatting.
*   `resources.json`: The generated database of available files.
*   `resources/`: Directory containing the actual binary files (PDFs, MP4s, etc.) and their generated thumbnails.

### `/scripts` (Tooling)
*   `add_resource.js`: A Node.js interactive CLI tool.
    *   **Purpose:** Scans `public/resources/` for new files, generates PDF thumbnails, prompts the user for metadata, and updates `resources.json`.
    *   **Usage:** Run via `npm run add`.

### `/docs`
*   `ARCHITECTURE.md`: Extremely detailed documentation on system design, decision log (e.g., why Vanilla JS?), and security threat models. **Read this before making architectural changes.**

## Development Workflows

### 1. Adding New Resources
Do not manually edit `resources.json`. Instead:
1.  Place the new file (PDF, MP4, etc.) into `public/resources/`.
2.  Run the ingestion script:
    ```bash
    npm run add
    ```
3.  Follow the interactive prompts to add metadata.
4.  Commit the updated `resources.json` and the new file.

### 2. Running Locally
The project uses a simple Python HTTP server for development.
```bash
npm run serve
# or
python3 -m http.server 8000 --directory public
```
Access at `http://localhost:8000`.

### 3. Coding Conventions
*   **No Frameworks:** Do not introduce React, Vue, or other frameworks. Stick to idiomatic Vanilla JS.
*   **Security:** ALWAYS use `sanitizeHTML()` from `utils.js` when rendering user-generated content or filenames to the DOM.
*   **DOM Manipulation:** Use `document.getElementById` and `classList` toggling. Avoid `innerHTML` where possible (use `textContent`).
*   **State:** Modify the global state objects in `app.js` directly (no Redux/Flux pattern).
*   **Comments:** The project values clear "Why" comments over "What" comments.

## Feature Implementation Details

*   **P2P "AirShare":**
    *   Uses a **Manual Handshake**: Sender generates a PIN -> Receiver enters PIN -> WebRTC connection established.
    *   Files are transferred via DataChannel.
    *   Receiver must click a "Save" button (browser security requirement) to download the Blob.
*   **PDF Rendering:**
    *   Uses `PDF.js` with a custom lazy-loading implementation to prevent memory crashes on mobile devices (renders pages in batches).
*   **Search:**
    *   Client-side fuzzy search using Levenshtein distance (implemented in `utils.js`).
