# TechBros Library: Architecture & Design

**Version:** 1.0.0 (Alpha)
**Author:** Collins Mwangi
**Date:** December 2025

## 1. Project Overview

**TechBros Library** is an offline-first Progressive Web Application (PWA) designed to distribute educational resources (PDFs, Videos, Images) to students with limited or intermittent internet connectivity.

Unlike traditional web apps that rely on constant server queries, this system operates on a **"Download Once, Read Forever"** philosophy. The entire application logic and database index are lightweight enough to be cached on the client side, allowing for a near-native experience on Android devices without the friction of an app store download.

## 2. Technical Stack

We adhere to a **"Vanilla & Verification"** approach—minimizing dependencies to ensure long-term maintainability and performance on low-end devices.

* **Frontend:** HTML5, CSS3 (Grid/Flexbox), JavaScript (ES Modules).
* **State Management:** Vanilla JS objects (No React/Vue/Angular).
* **Database:** `resources.json` (A flat-file, read-only JSON index).
* **Rendering Engine:**
    * **PDFs:** Mozilla PDF.js (Client-side Canvas rendering).
    * **Video:** HTML5 Native Video Player.
    * **Images:** Standard DOM rendering.
* **Offline Capability:** Service Workers (Cache API).
* **Infrastructure:** Cloudflare Pages (Static Edge Hosting).

## 3. System Architecture

### 3.1 The "Flat-File" Database Model
Instead of a SQL database, the "truth" of the application is stored in the file system.
* **Storage:** Actual binary files (`.pdf`, `.mp4`) reside in `public/resources/`.
* **Indexing:** A Node.js script scans this folder and generates a static `public/resources.json` file.
* **Querying:** The frontend fetches this JSON file (approx. 10-50KB) and performs filtering/searching in-memory on the client device.

**Benefit:** Zero database latency, zero backend maintenance, and instant search response.

### 3.2 Data Ingestion Workflow (The Admin Loop)
We use a custom CLI tool (`scripts/add_resource.js`) to manage the library:

1.  **Ingest:** Admin drops files into `public/resources/`.
2.  **Scan:** Script detects new files (Diff check against JSON).
3.  **Metadata:** Script extracts metadata (PDF Author/Title) or prompts Admin.
4.  **Build:** Script updates `resources.json`.
5.  **Deploy:** Git push triggers Cloudflare Pages build.

### 3.3 The Offline Strategy (Service Worker)
We utilize a **Hybrid Caching Strategy**:

* **App Shell (HTML/CSS/JS):** `Cache-First` (Update on reload). This ensures the UI loads instantly.
* **Database Index (`resources.json`):** `Network-First` (Falls back to cache). This ensures users see new books if they have internet.
* **Heavy Assets (PDFs/Videos):** `Cache-on-Demand`. Files are only cached *after* the user opens them. This prevents the user's phone storage from filling up with unread books.

## 4. Component Design

The application is a Single Page Application (SPA) with a virtual router handled by CSS transitions.

* **The Librarian (List View):** Responsible for parsing JSON, rendering the DOM list, and handling Search/Filter logic.
* **The Projector (Viewer View):** A dedicated overlay for consuming content. It manages the `history.pushState` API to intercept the Android "Back" button, preventing the app from closing when a user exits a document.

## 5. Folder Structure

/
├── public/                 # The "Distribution" folder (Hosted on Web)
│   ├── resources/          # Binary assets (PDFs, MP4s)
│   ├── resources.json      # The Generated Database
│   ├── index.html          # Entry point
│   ├── app.js              # Core Application Logic
│   ├── sw.js               # Service Worker (Offline Logic)
│   └── manifest.json       # PWA Configuration
│
├── scripts/                # Admin Tools (Not deployed)
│   └── add_resource.js     # CLI for ingesting files
│
└── docs/                   # Documentation
    └── ARCHITECTURE.md     # System Design (This file)

## 6. Future Roadmap

We intend to evolve TechBros from a static repository to a dynamic platform, while maintaining the "First Principles" simplicity.

### Phase 1: UX Refinements (Current)
* [x] Splash Screen implementation.
* [x] Filter Chips (Math/Physics/Exam).
* [ ] "Favorites" list (Local Storage).
* [ ] Dark Mode toggle.

### Phase 2: Community Features
* **Peer-to-Peer Sharing:** Implement WebRTC to allow users to share PDFs offline (Bluetooth/Wi-Fi Direct) without using data.
* **Comments System:** A lightweight, optional comment section for exam papers (likely using a third-party service like Giscus or a serverless function).

### Phase 3: Administrative
* **Automated Thumbnails:** generating cover images for the PDFs during the build script to make the UI more visual.
* **Analytics:** Privacy-focused tracking to see which resources are most popular.

---
*Documentation maintained by Collins Mwangi.*