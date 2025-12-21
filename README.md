<div align="center">

![TechBros Library](public/favicon.png)

# TechBros Library

### Offline-First Educational Resource Platform with P2P File Sharing

[![Live Site](https://img.shields.io/badge/🌐_Live-techbros.pages.dev-blue?style=for-the-badge)](https://techbros.pages.dev)
[![Version](https://img.shields.io/badge/version-2.0.0-green?style=for-the-badge)](https://github.com/ny-collins/techbros)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](LICENSE)

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
- **Fuzzy Search:** Typo-tolerant search using Levenshtein distance.
- **Lazy Loading:** Efficiently renders large PDFs to save memory.
- **Multiple Views:** Toggle between Grid and List layouts.
- **Theming:** Dark mode (default) and Light mode with high contrast.

### 🔄 P2P AirShare
- **Device-to-Device:** Share files directly using a simple 4-digit PIN.
- **Secure:** Automatic file type validation and sanitization.
- **Cross-Platform:** Works between any devices running a modern browser.

### 🛠️ Technical Highlights
- **Architecture:** Modular Vanilla JavaScript (Store, UI, P2P).
- **Caching:** Advanced Service Worker strategies (Network-First for data, Cache-First for assets).
- **Security:** Strict input sanitization to prevent XSS.

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

# Install dependencies (for resource scripts)
npm install

# Run local server
npm run dev
# OR
python3 -m http.server 8000 --directory public
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Architecture Guide](docs/ARCHITECTURE.md)** | System design, module breakdown, and security model. |
| **[Contributing](docs/CONTRIBUTING.md)** | How to contribute and coding standards. |

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file.

---

<div align="center">

**Made with ❤️ for offline-first education**

</div>