<div align="center">

![TechBros Library](public/favicon.png)

# TechBros Library

### Offline-First Educational Resource Platform with P2P File Sharing

[![Live Site](https://img.shields.io/badge/🌐_Live-techbros.pages.dev-blue?style=for-the-badge)](https://techbros.pages.dev)
[![Version](https://img.shields.io/badge/version-2.0.0-green?style=for-the-badge)](https://github.com/ny-collins/techbros)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-8%20passed-brightgreen?style=for-the-badge)](https://github.com/ny-collins/techbros)

[🚀 Launch App](https://techbros.pages.dev) • [📖 Documentation](docs/ARCHITECTURE.md) • [🤝 Contributing](docs/CONTRIBUTING.md)

</div>

---

## 🎯 What is TechBros?

TechBros Library is a **Progressive Web Application (PWA)** that brings educational resources to users with limited internet connectivity. Built on a **"Download Once, Read Forever"** philosophy, it combines:

- **📚 Offline-First Library** - Access PDFs, videos, and audio without internet.
- **🔄 P2P File Sharing** - Share files directly between devices using WebRTC (No internet required after handshake).
- **⚡ Zero Backend** - No servers, no databases, no hosting costs.
- **📱 Universal Access** - Works on Mobile, Desktop, and Android TV.

---

## ✨ Key Features

### 📖 Smart Library
- **Fuzzy Search:** Typo-tolerant search using Levenshtein distance algorithm.
- **Multiple Formats:** Support for PDFs, videos, audio files, and images.
- **Grid/List Views:** Toggle between different layout options.
- **Theming:** Dark mode (default) and Light mode with high contrast.
- **Responsive Design:** Optimized for mobile, tablet, and desktop screens.

### 🔄 P2P AirShare
- **Device-to-Device:** Share files directly using a simple 4-digit PIN.
- **File Chunking:** Large files are split into chunks for reliable transfer.
- **Progress Tracking:** Real-time transfer progress with visual indicators.
- **Secure:** Automatic file type validation and sanitization.
- **Cross-Platform:** Works between any devices running a modern browser.

### 🛠️ Technical Highlights
- **Architecture:** Modular Vanilla JavaScript (Store, UI, P2P) with zero dependencies in production.
- **Caching:** Advanced Service Worker strategies (Network-First for data, Cache-First for assets).
- **Security:** Strict input sanitization, file type validation, and XSS prevention.
- **Performance:** Optimized for low-bandwidth environments with lazy loading.
- **Testing:** Comprehensive Jest test suite with 8 passing tests.

---

## 🚀 Quick Start

### For Users

**1. Visit the live site:**
👉 **[techbros.pages.dev](https://techbros.pages.dev)** 👈

**2. Install:**
Click "Add to Home Screen" to install as a native app.

### For Developers

```bash
# Clone the repository
git clone https://github.com/ny-collins/techbros.git
cd techbros

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Add resources to library
npm run add
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Architecture Guide](docs/ARCHITECTURE.md)** | System design, module breakdown, and security model. |
| **[Contributing](docs/CONTRIBUTING.md)** | How to contribute and coding standards. |

---

## 🧪 Testing

The project includes a comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

**Test Coverage:**
- Store functionality (search, settings, state management)
- 8 passing tests with Jest framework
- ES6 module support with Babel transpilation

---

## 📦 Build & Deployment

### Local Development
```bash
# Start dev server (Python)
npm run dev

# Start dev server (Vite - alternative)
npm run dev:vite
```

### Production Build
```bash
# Build optimized assets
npm run build

# Output: dist/ directory with production-ready files
```

### Deployment
The app is designed for static hosting. Deploy the `dist/` folder or `public/` directory to any static host like:
- Cloudflare Pages
- Netlify
- GitHub Pages
- Vercel

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file.

---

<div align="center">

**Made with ❤️ for offline-first education**

*Built with Vanilla JavaScript • Zero Dependencies in Production • PWA Ready*

</div>