# TechBros Library: Architecture & Design Documentation

**Version:** 2.0.0  
**Last Updated:** December 21, 2025  
**Author:** Collins Mwangi

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Technology Stack & Rationale](#technology-stack--rationale)
4. [Core Components Deep Dive](#core-components-deep-dive)
5. [Data Flow & State Management](#data-flow--state-management)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)

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
