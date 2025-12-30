# TechBros Library v3.0.0

**Offline-First Educational Resource Platform & P2P Sharing System**

![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)
![Platform](https://img.shields.io/badge/platform-PWA-blue?style=flat-square)

TechBros Library is a specialized Progressive Web Application (PWA) built to bridge the digital divide. It enables users to download, organize, and share educational resources (PDFs, Audio, Video) without relying on consistent internet access.

## Key Features

*   **Offline-First:** Works fully without internet after initial load.
*   **Peer-to-Peer (P2P):** Share large files directly between devices using WebRTC (AirShare).
*   **Instant Text Chat:** Communicate with peers directly in the app while transferring files (Works Offline!).
*   **Universal Viewer:** Preview PDFs, Video, Audio, and Code/Text files directly in the browser.
*   **Resumable Transfers:** Interrupted transfers automatically resume from where they left off.
*   **Zero-Data:** "Download Once, Share Forever" architecture.
*   **Smart Search:** Fuzzy search algorithm tolerates typos.
*   **Cross-Platform:** Responsive design for Mobile, Tablet, and Desktop.

## Architecture Overview

The system operates on a **Hybrid Architecture**:
*   **Core:** Client-side Static Site (offline-capable).
*   **Cloud:** Serverless Functions (Cloudflare Pages) for centralized resource listing and uploads.

```ascii
[ User A ] <=== ( WebRTC ) ===> [ User B ]
    |                               |
[ Local Storage ]               [ Local Storage ]
    ^                               ^
    | (Sync)                        | (Sync)
    v                               v
[ Cloudflare CDN ] <==> [ Cloudflare Functions ] <==> [ R2 Bucket ]
```

For a deep dive into the technical design, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Installation & Setup

### Prerequisites
*   **Node.js** (v16 or higher)
*   **NPM**

### Quick Start

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ny-collins/techbros.git
    cd techbros
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start Development Server**
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:3000`.

### Building for Production

To create an optimized build for deployment (e.g., Cloudflare Pages, Netlify):

```bash
npm run build
```
This generates a `dist/` folder containing the static assets.

## Testing

Run the test suite to ensure system stability:

```bash
npm test
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
