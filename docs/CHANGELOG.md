# Changelog

All notable changes to TechBros Library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
