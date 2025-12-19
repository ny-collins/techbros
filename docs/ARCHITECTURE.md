# TechBros Library: Architecture & Design

**Version:** 1.3.0 (Production)
**Author:** Collins Mwangi
**Date:** December 2025

## 1. Project Overview

**TechBros Library** is a multimedia, offline-first Progressive Web Application (PWA) designed to distribute educational resources to users with limited internet connectivity.

It operates on a **"Download Once, Read Forever"** philosophy, effectively turning any device (Phone, Tablet, or Android TV) into a self-contained learning hub. The system now includes a decentralized Peer-to-Peer (P2P) sharing layer, allowing users to distribute content directly between devices without a central server.

## 2. Technical Stack

We adhere to a **"Vanilla & Verification"** approach—minimizing dependencies to ensure long-term maintainability.

* **Frontend:** HTML5, CSS3 (Variables + Grid), JavaScript (ES Modules).
* **State Management:** Vanilla JS objects & LocalStorage.
* **Database:** `resources.json` (Flat-file, read-only index).
* **Networking:**
    * **P2P:** WebRTC (via PeerJS) for device-to-device transfers.
    * **CDN:** Cloudflare Pages for static asset delivery.
* **Rendering Engines:**
    * **PDF:** Mozilla PDF.js.
    * **Audio/Video:** HTML5 Native Media Elements.
    * **Icons:** Phosphor Icons (SVG/Script).

## 3. System Architecture

### 3.1 The "Flat-File" Database Model
The application state is derived entirely from the file system.
* **Ingestion:** The `scripts/add_resource.js` CLI tool scans the `public/resources/` directory.
* **Indexing:** It generates a static JSON index containing metadata (Title, Type, Size, Path).
* **Search:** The client downloads this lightweight index (KB) and performs instant, in-memory fuzzy searching.

### 3.2 The Offline Strategy (Hybrid Caching)
We utilize a Service Worker (`sw.js`) with a prioritized caching strategy:
1.  **App Shell (UI/Logic):** `Cache-First`. Ensures instant load times.
2.  **Database (`resources.json`):** `Network-First`. Ensures users see new content if connected.
3.  **Heavy Media:** `Cache-on-Demand`. Files are cached only when opened to conserve device storage.

### 3.3 The Connectivity Layer (AirShare)
To solve the distribution problem in offline environments, we implemented a **No-Auth P2P Protocol**:
* **Signaling:** Users exchange a short 4-digit PIN to identify each other on a public signaling server.
* **Transport:** Once the handshake is complete, a direct WebRTC DataChannel is established.
* **Transfer:** Binary data (Blobs) is streamed directly from Peer A to Peer B. No user accounts or central database are required.

## 4. Component Design

### 4.1 The Librarian (List View)
Handles the display and filtering of resources.
* **Layout Engine:** Supports 3 modes (List, Grid, Hybrid) toggled via CSS classes.
* **Theme Engine:** Uses CSS Variables to switch between System, Light, and Dark modes instantly.

### 4.2 The Projector (Viewer)
A dynamic overlay that selects the correct rendering engine based on MIME type:
* **PDFs:** Renders to `<canvas>` via PDF.js.
* **Video:** Native player with auto-focus.
* **Audio:** Custom visualizer with pulsing animations (`renderAudio`).

### 4.3 The Navigator (Accessibility & TV Mode)
The app is fully navigable via D-Pad (Android TV) and Keyboard.
* **Focus Management:** All interactive cards use `tabindex="0"`.
* **Event Listeners:** Maps the physical `Enter` key to click events.
* **Visual Feedback:** CSS `outline` and `transform` properties provide a "Focus Ring" for remote control users.

## 5. Folder Structure

/
├── public/                 # Distribution Folder
│   ├── resources/          # Binary Assets (PDF, MP3, MP4)
│   ├── resources.json      # Generated Database
│   ├── index.html          # Application Shell
│   ├── app.js              # Business Logic (P2P, UI, Router)
│   ├── style.css           # Theme Engine & Layouts
│   ├── sw.js               # Service Worker
│   └── manifest.json       # PWA Config
│
├── scripts/                # CI/CD Tools
│   └── add_resource.js     # Ingestion Script (Node.js)
│
└── docs/                   # Documentation
    └── ARCHITECTURE.md     # System Design

## 6. Roadmap

### Completed Features (v1.3)
* [x] Universal File Support (PDF, Video, Audio, Doc).
* [x] Android TV / Remote Navigation.
* [x] Dark Mode & Layout Customization.
* [x] P2P "AirShare" System.
* [x] Visual Polish (Phosphor Icons & Animations).

### Future Goals
* **Automated Thumbnails:** Generating cover images for PDFs/Videos during the build step to enhance the Grid View.
* **Watch History:** A "Continue Reading" section stored in LocalStorage.
* **Analytics:** Privacy-focused tracking to identify popular resources.

---
*Documentation maintained by Collins Mwangi.*