# Changelog

All notable changes to TechBros Library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.4] - 2025-12-20

### Added
- **Vendored Phosphor Icons**: Downloaded all icon assets to `/public/vendor/phosphor/`
  - Regular icon CSS (78KB)
  - Duotone icon CSS (231KB)
  - Font files: woff2 (147KB), woff (489KB), ttf (489KB)
  - Ensures icons display without CDN dependency
  - Works completely offline after first visit
  - Eliminates unpkg.com dependency

### Changed
- **Icon Loading**: Replaced CDN script with local CSS files
  - Removed: `<script src="https://unpkg.com/@phosphor-icons/web@2.1.1">`
  - Added: `<link rel="stylesheet" href="/vendor/phosphor/regular.css">`
  - Added: `<link rel="stylesheet" href="/vendor/phosphor/duotone.css">`
- **Service Worker Cache**: Added all icon assets to ASSETS_TO_CACHE
- **Performance**: Icons load from local cache instead of network request

### Fixed
- **Missing Icons**: Icons now display correctly on all pages
  - Hamburger menu icon (ph-list)
  - Send/Receive icons (ph-paper-plane-tilt, ph-broadcast)
  - All sidebar navigation icons
  - All sub-page icons
- **CDN Reliability**: No longer affected by unpkg.com availability or blocks

### Technical
- Total icon assets: ~1.5MB (compressed efficiently by Cloudflare)
- Font format priority: woff2 → woff → ttf for broad browser support
- CSS references use relative paths for proper font loading

---

## [1.5.3] - 2025-12-20

### Added
- **Local PDF.js Worker**: Downloaded pdf.worker.min.js (1.1MB) to `/public/vendor/`
  - Ensures PDF rendering works 100% offline without CDN dependency
  - Eliminates risk of blocked CDN in restricted regions
  - Worker cached by Service Worker on first load
- **Enhanced .gitignore**: Added comprehensive OS and IDE exclusions
  - macOS: .DS_Store, .AppleDouble, .LSOverride
  - Windows: Thumbs.db, Desktop.ini
  - IDEs: .vscode, .idea, vim swap files

### Changed
- **Worker Path**: Updated `pdfjsLib.GlobalWorkerOptions.workerSrc` from CDN to local path
- **Service Worker Cache**: Replaced CDN worker URL with `/vendor/pdf.worker.min.js`
- **True Offline Capability**: App now functions completely offline after first visit

### Technical
- Created `/public/vendor/` directory for vendored dependencies
- Worker file integrity verified (SHA-384 from CDN download)
- No build process changes - still static file deployment

### Performance
- Worker loads from local cache instead of network request
- Reduces dependency on external CDN availability
- Faster PDF rendering on subsequent visits

---

## [1.5.2] - 2025-12-20

### Added
- **Security Headers**: Comprehensive security headers via `_headers` file
  - Content-Security-Policy (CSP) for XSS protection
  - X-Frame-Options to prevent clickjacking
  - Strict-Transport-Security (HSTS) to enforce HTTPS
  - Permissions-Policy to restrict browser features
  - X-XSS-Protection for legacy browser protection
- **Subresource Integrity (SRI)**: Added integrity hashes to all external CDN scripts
  - Phosphor Icons (unpkg.com/@phosphor-icons/web@2.1.1)
  - PeerJS (unpkg.com/peerjs@1.5.2)
  - PDF.js libraries (cdnjs.cloudflare.com)
- **SEO Files**: Created robots.txt and sitemap.xml for better search engine indexing
- **Cache Headers**: Optimized cache control for different resource types
  - Service Worker: no-cache
  - Manifest: 1 day cache
  - JS/CSS: 1 week cache (immutable)
  - Images/PDFs: 1 month cache (immutable)

### Security
- **Grade Improvement**: Security grade increased from B+ to A
- **External Script Validation**: All CDN scripts now verified with SRI hashes
- **HTTPS Enforcement**: HSTS with 1-year max-age and includeSubDomains
- **Clickjacking Protection**: X-Frame-Options set to DENY
- **CSP Implementation**: Strict Content Security Policy blocks unauthorized resources

### Changed
- External scripts now include crossorigin="anonymous" attribute
- Pinned Phosphor Icons to specific version (2.1.1) for stability
- Updated all version references across codebase to 1.5.2

### Technical
- Added `_headers` file for Cloudflare Pages configuration
- Configured granular cache control for optimal performance
- Improved SEO with proper robots.txt and sitemap.xml

---

## [1.5.1] - 2025-12-19

### Added
- **Automatic Update System**: App now checks for updates automatically
- **Update Notifications**: Beautiful toast notification when updates are available
- **One-Click Updates**: "Update Now" button for instant updates
- **Hourly Update Checks**: Automatically checks for new versions every hour
- **Smooth Update Flow**: Loading overlay during update process
- **Success Confirmation**: Toast notification after successful update
- **Immediate Activation**: New Service Worker activates without waiting for tabs to close

### Changed
- Service Worker now uses `skipWaiting()` for instant activation
- Service Worker registration uses `updateViaCache: 'none'` for better update detection
- Update process no longer requires manual cache clearing
- Users no longer need to close all tabs for updates to apply

### Fixed
- Users can now receive updates without manual intervention
- Cache staleness issues resolved with automatic update system
- No more "hard refresh" needed to see new versions

### Technical
- Added `setupServiceWorkerUpdates()` function in app.js
- Service Worker sends `SW_UPDATED` messages to clients
- Implemented `checkForUpdates()` with hourly interval
- Added message handler in SW for `SKIP_WAITING` command
- Update notification UI with purple gradient design

## [1.5.0] - 2025-12-19

### Added
- **Sidebar Navigation**: Hamburger menu with access to all app sections
- **Sub-Pages**: Settings, Export Data, About, Help pages
- **Fuzzy Search**: Intelligent search using Levenshtein distance algorithm
- **File Validation**: Security checks for P2P transfers (type, size, extensions)
- **XSS Protection**: Input sanitization for all user-provided content
- **Online/Offline Indicator**: Real-time connection status in header
- **PDF Lazy Loading**: Memory-efficient rendering (5 pages initial, 3 at a time)
- **Export Functionality**: Export settings and resource list as JSON
- **Cache Management**: Clear cache button with storage usage display
- **Utility Module**: Centralized security and helper functions
- **Comprehensive README**: Full documentation with setup and troubleshooting
- **CHANGELOG**: Version history tracking
- **Toast Notifications**: Visual feedback for user actions
- **Better Error Handling**: Specific, actionable error messages for P2P failures
- **Search Clear Button**: Quick reset for search input
- **Responsive Sidebar**: Mobile-friendly slide-in navigation

### Changed
- **Service Worker**: Dynamic cache versioning with timestamp
- **Caching Strategy**: Separate caches for app shell and resources
- **resources.json**: Network-first strategy (was cache-first)
- **App Structure**: Modular ES6 imports
- **Theme Toggle**: Moved to Settings page (from modal)
- **Layout Toggle**: Moved to Settings page (from modal)
- **PDF Rendering**: Now uses virtualized scrolling
- **P2P Error Messages**: More descriptive with solutions
- **Card Rendering**: Uses textContent for XSS safety
- **Manifest**: Updated to v1.5.0 with categories

### Fixed
- **Security**: XSS vulnerabilities in filename/title display
- **Memory Leak**: PDF rendering no longer loads all pages at once
- **Cache Staleness**: Resources.json now updates properly
- **Settings Persistence**: Better error handling for localStorage failures
- **P2P Filename Sanitization**: Special characters removed before download
- **Search Performance**: Debounced input prevents lag
- **Service Worker Update**: Old caches properly cleaned up
- **Accessibility**: Improved keyboard navigation

### Security
- Input sanitization prevents code injection
- File type validation blocks executables
- 500MB file size limit enforced
- Filename sanitization for downloads
- MIME type checking for uploads

## [1.4.0] - 2025-12-15

### Added
- P2P file sharing (local files)
- Visual polish with Phosphor Icons
- Animations for better UX
- Android TV navigation support

### Changed
- Improved UI/UX
- Better mobile responsiveness

## [1.3.0] - 2025-12-10

### Added
- Dark mode support
- Layout customization (List, Grid, Hybrid)
- P2P sharing for library resources

## [1.2.0] - 2025-12-05

### Added
- PDF thumbnail generation
- Category filters
- Search functionality

## [1.1.0] - 2025-12-01

### Added
- Service Worker for offline support
- PWA manifest
- PDF.js viewer

## [1.0.0] - 2025-11-25

### Added
- Initial release
- Basic resource library
- Flat-file database
- Simple card-based UI

---

## Upgrade Guide

### From v1.5.0 to v1.5.1

**Breaking Changes:** None

**Automatic Update:**
- Users will see an "Update Available" notification automatically
- One click to update - no manual steps required
- All cache management handled automatically

**What's New:**
- App now updates itself when online
- No more manual cache clearing
- Beautiful update notifications
- Hourly update checks

### From v1.4.0 to v1.5.0

**Breaking Changes:** None

**Recommended Actions:**
1. Clear browser cache to get new Service Worker
2. Update any bookmarks (sidebar replaces settings modal)
3. Review new security features in README
4. Export your settings using new Export Data page

**New Features to Try:**
- Open sidebar (☰) to explore new pages
- Use fuzzy search (try misspellings!)
- Check Export Data page for storage info
- Test improved P2P error messages

### Migration Notes

**LocalStorage:**
- Settings structure unchanged, fully compatible
- No data migration needed

**Service Worker:**
- Cache names changed (old caches auto-deleted)
- First load may be slower (re-caching)

**API:**
- No API changes
- All existing features work as before
- New utils.js module available for extension

---

## Future Releases

### [1.6.0] - Planned Q1 2026
- Unit and integration tests
- TypeScript migration
- Build pipeline with bundling
- Resource versioning/updates

### [2.0.0] - Planned Q2 2026
- Cloud sync (optional)
- User authentication (optional)
- Collaborative features
- Admin dashboard

---

[1.5.1]: https://github.com/ny-collins/techbros/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/ny-collins/techbros/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ny-collins/techbros/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/ny-collins/techbros/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ny-collins/techbros/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ny-collins/techbros/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ny-collins/techbros/releases/tag/v1.0.0
