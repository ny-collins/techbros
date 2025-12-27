# TechBros Library

**Offline-First Educational Resource Platform with Peer-to-Peer File Sharing**

[![Version](https://img.shields.io/badge/version-2.0.0-blue?style=flat-square)](https://github.com/ny-collins/techbros)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](https://github.com/ny-collins/techbros/actions)

TechBros Library is a Progressive Web Application (PWA) designed to provide educational resource access in low-bandwidth and offline environments. It leverages client-side storage and WebRTC-based peer-to-peer networking to distribute content without reliance on centralized infrastructure.

## System Overview

The application functions as a local repository for educational materials (PDFs, Audio, Video). It employs a "Download Once, Read Forever" architecture, utilizing Service Workers for caching and IndexedDB for state management.

### Core Capabilities

*   **Offline-First Architecture:** Resources are cached locally, allowing full application functionality without network connectivity.
*   **Peer-to-Peer Distribution:** Enables direct file transfer between client devices using WebRTC. Supports both signaling server-mediated connections (Online) and QR code-based manual signaling (Offline/LAN).
*   **Zero-Backend Deployment:** Operates as a static site with no server-side database requirements.
*   **Cross-Platform Compatibility:** Responsive design supporting Mobile, Tablet, and Desktop environments.

## Technical Specifications

### Library Management
*   **Search Algorithm:** Implements Levenshtein distance for fuzzy search capability.
*   **Format Support:** Native rendering for PDF, MP4, and MP3 formats.
*   **Interface:** Customizable Grid and List views with persistent theme preferences (Dark/Light).

### P2P File Transfer Protocol
*   **Transport:** WebRTC Data Channels via PeerJS.
*   **Signaling:**
    *   **Online:** WebSocket connection to PeerJS cloud signaling.
    *   **Offline:** Manual Session Description Protocol (SDP) exchange via QR Codes.
*   **Performance:** Implements File System Access API for streaming writes, mitigating memory constraints during large file transfers.
*   **Security:** File type validation and Content Security Policy (CSP) enforcement.

## Installation and Setup

### User Installation
Access the application via a supported web browser. For offline persistence, install the application to the device home screen when prompted.

### Developer Setup

**Prerequisites:** Node.js (v16+)

1.  **Clone Repository**
    ```bash
    git clone https://github.com/ny-collins/techbros.git
    cd techbros
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Development Server**
    Start the Vite development server with hot module replacement:
    ```bash
    npm run dev
    ```

4.  **Production Build**
    Generate optimized static assets in the `dist/` directory:
    ```bash
    npm run build
    ```

5.  **Testing**
    Execute the test suite using Jest:
    ```bash
    npm test
    ```

## Documentation

*   **[Architecture Guide](docs/ARCHITECTURE.md):** Detailed system design, data flow, and security model.
*   **[Contributing Guidelines](docs/CONTRIBUTING.md):** Code standards and pull request process.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.