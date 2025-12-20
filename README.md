<div align="center">

![TechBros Library](public/favicon.png)

# TechBros Library

### Offline-First Educational Resource Platform with P2P File Sharing

[![Live Site](https://img.shields.io/badge/🌐_Live-techbros.pages.dev-blue?style=for-the-badge)](https://techbros.pages.dev)
[![Version](https://img.shields.io/badge/version-1.5.6-green?style=for-the-badge)](https://github.com/ny-collins/techbros)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge)](https://web.dev/progressive-web-apps/)

[🚀 Launch App](https://techbros.pages.dev) • [📖 Documentation](docs/ARCHITECTURE.md) • [📝 Changelog](docs/CHANGELOG.md) • [🤝 Contributing](docs/CONTRIBUTING.md)

</div>

---

## 🎯 What is TechBros?

TechBros Library is a **Progressive Web Application** that brings educational resources to users with limited internet connectivity. Built on a **"Download Once, Read Forever"** philosophy, it combines:

- **📚 Offline-First Library** - Access PDFs, videos, and audio without internet
- **🔄 P2P File Sharing** - Share files directly between devices using WebRTC
- **⚡ Zero Backend** - No servers, no databases, no hosting costs
- **🌍 Global CDN** - Served from 300+ edge locations via Cloudflare Pages

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 📖 Resource Library
- **Offline Access** - Works without internet after first load
- **Smart Search** - Fuzzy search with typo tolerance
- **Multiple Layouts** - List, Grid, and Hybrid views
- **Dark Mode** - System, light, and dark themes

</td>
<td width="50%">

### 🔄 P2P Sharing
- **Direct Transfer** - Device-to-device file sharing
- **No Internet Required** - Works on local networks
- **Secure** - File validation & size limits
- **Universal** - Share any file up to 500MB

</td>
</tr>
<tr>
<td width="50%">

### 📱 Progressive Web App
- **Installable** - Add to home screen
- **Responsive** - Mobile, tablet, desktop, TV
- **Fast** - Lazy loading & smart caching
- **Accessible** - Keyboard navigation support

</td>
<td width="50%">

### 🔒 Security
- **XSS Protection** - Input sanitization
- **File Validation** - Type & size checks
- **Executable Blocking** - Malware prevention
- **HTTPS Only** - Secure connections

</td>
</tr>
</table>

---

## 🚀 Quick Start

### For Users

**1. Visit the live site:**

👉 **[techbros.pages.dev](https://techbros.pages.dev)** 👈

**2. Install as PWA (optional):**
- **Chrome/Edge:** Click install icon in address bar
- **Safari:** Share → Add to Home Screen
- **Android:** "Add to Home Screen" prompt

**3. Use offline:**
- Browse resources and they'll cache automatically
- Close browser and revisit - everything still works!

### For Developers

```bash
# Clone the repository
git clone https://github.com/ny-collins/techbros.git
cd techbros

# Install CLI tools (optional)
npm install

# Serve locally
python3 -m http.server 8000 --directory public

# Open in browser
open http://localhost:8000
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Architecture Guide](docs/ARCHITECTURE.md)** | System design, tech stack rationale, diagrams |
| **[Changelog](docs/CHANGELOG.md)** | Version history and upgrade guide |
| **[Contributing](docs/CONTRIBUTING.md)** | How to contribute, coding standards |

---

## 🛠️ Technology Stack

- **Frontend:** Vanilla JavaScript (ES Modules), HTML5, CSS3
- **P2P:** WebRTC (PeerJS)
- **PDF Rendering:** PDF.js with lazy loading
- **Offline:** Service Worker with custom caching strategies
- **Hosting:** Cloudflare Pages (global CDN)
- **Icons:** Phosphor Icons

*No frameworks, no build step, no backend servers.*

---

## 📸 Preview

<div align="center">

**Experience the full application at [techbros.pages.dev](https://techbros.pages.dev)**

*Screenshots coming soon - for now, visit the live site to see it in action!*

</div>

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for:
- Code style guidelines
- Commit conventions
- Testing checklist
- Development setup

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file.

---

## 👤 Author

**Collins Mwangi**

- GitHub: [@ny-collins](https://github.com/ny-collins)
- Live Site: [techbros.pages.dev](https://techbros.pages.dev)

---

## ⭐ Acknowledgments

- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering engine
- [PeerJS](https://peerjs.com/) - WebRTC wrapper
- [Phosphor Icons](https://phosphoricons.com/) - Beautiful icon set
- [Cloudflare Pages](https://pages.cloudflare.com/) - Global hosting

---

<div align="center">

**Made with ❤️ for offline-first education**

[🌐 Visit Live Site](https://techbros.pages.dev) • [📖 Read Docs](docs/ARCHITECTURE.md) • [🐛 Report Issue](https://github.com/ny-collins/techbros/issues)

</div>
