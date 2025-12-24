# Contributing to TechBros Library

First off, thank you for considering contributing to TechBros Library! 🎉

## Code of Conduct

This project and everyone participating in it is governed by a code of respect and professionalism. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When filing a bug report, please include:**
- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots (if applicable)
- Browser and OS version
- Console errors (if any)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- Clear, descriptive title
- Detailed description of the proposed functionality
- Explain why this enhancement would be useful
- List any alternative solutions you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Test thoroughly** on multiple browsers and run the test suite
4. **Update documentation** if needed
5. **Commit with clear messages** following our commit guidelines
6. **Open a pull request** with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/techbros.git
cd techbros

# Install dependencies
npm install

# Start development server (Vite - recommended)
npm run dev:vite

# Alternative: Python server for static files
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Add resources to library (if testing ingestion)
npm run add
```

## Coding Standards

### Core Philosophy: Comment-Free Code

**Important:** This project maintains a strict **no-comments policy** in source code. All code must be self-documenting through:

- Clear, descriptive function and variable names
- Small, focused functions (single responsibility)
- Logical code organization
- Comprehensive test coverage

```javascript
// ❌ DON'T: Add comments to explain what code does
// Calculate the Levenshtein distance between two strings
function levenshtein(a, b) {
    // ...

// ✅ DO: Make the code self-explanatory
function calculateEditDistance(sourceText, targetText) {
    // Implementation is clear from function name and logic
```

### JavaScript Standards

```javascript
// ✅ DO: Use ES6+ features and modern syntax
const filteredResources = allResources.filter(resource => resource.type === 'pdf');
const userPreferences = getUserSettings();

// ✅ DO: Use descriptive, specific variable names
const searchResults = performFuzzySearch(query, resources);
const transferProgress = calculateProgress(sentBytes, totalBytes);

// ✅ DO: Keep functions small and focused
function renderResourceCard(resource) {
    const card = createCardElement();
    populateCardData(card, resource);
    attachEventListeners(card);
    return card;
}

// ❌ DON'T: Use var, unclear names, or giant functions
var x = 10;
const fn = () => { /* 50 lines of mixed logic */ };
```

### Modular Architecture

```javascript
// ✅ DO: Keep modules focused and cohesive
// store.js - State management only
export class Store {
    search(query) { /* ... */ }
    saveSettings(settings) { /* ... */ }
}

// ui.js - DOM manipulation only
export class UI {
    renderSearchResults(results) { /* ... */ }
    updateProgressBar(progress) { /* ... */ }
}

// ❌ DON'T: Mix concerns across modules
// Don't put search logic in ui.js or DOM manipulation in store.js
```

### Security Standards

```javascript
// ✅ DO: Always sanitize user input
const safeTitle = sanitizeText(userInput);
element.textContent = safeTitle;

// ✅ DO: Validate files comprehensively
const validation = validateFileForTransfer(file);
if (!validation.isValid) {
    displayError(validation.errorMessage);
    return;
}

// ✅ DO: Use secure defaults
const secureConfig = {
    maxFileSize: 100 * 1024 * 1024, // 100MB limit
    allowedTypes: ['application/pdf', 'text/plain'],
    blockExecutables: true
};

// ❌ DON'T: Trust file extensions or use innerHTML
if (file.name.endsWith('.pdf')) { /* Insufficient */ }
element.innerHTML = `<div>${userInput}</div>`; // XSS risk
```

### CSS Standards

```css
/* ✅ DO: Use CSS variables for theming */
.card {
    background: var(--surface-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
}

/* ✅ DO: Use semantic class names */
.resource-card { /* ... */ }
.search-input { /* ... */ }
.progress-indicator { /* ... */ }

/* ✅ DO: Group related styles logically */
.card-grid {
    display: grid;
    gap: var(--spacing-medium);
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

/* ❌ DON'T: Use magic numbers or !important */
.card { padding: 17px; } /* Why 17? Use variables */
.text { color: red !important; } /* Avoid !important */
```

## Testing Requirements

### Automated Testing

All contributions must include comprehensive tests:

```bash
# Run full test suite
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage Areas

- **Store Module**: State management, search functionality, settings persistence
- **UI Module**: DOM manipulation, event handling, responsive behavior
- **P2P Module**: File transfer logic, chunking, error handling
- **Security**: Input sanitization, file validation

### Manual Testing Checklist

Before submitting a PR, please verify:

**Core Functionality:**
- [ ] Search works with fuzzy matching
- [ ] Resources load and display correctly
- [ ] P2P file transfer sends/receives files
- [ ] Settings persist across sessions
- [ ] Offline mode works properly

**Cross-Browser:**
- [ ] Chrome/Edge (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest, if available)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

**Responsive Design:**
- [ ] Mobile (320px+)
- [ ] Tablet (768px+)
- [ ] Desktop (1024px+)
- [ ] Large screens (1440px+)

**Performance:**
- [ ] Large PDFs load without freezing
- [ ] Search responds within 100ms
- [ ] No console errors or warnings
- [ ] Memory usage stays reasonable

## Commit Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add offline status indicator
fix: resolve P2P chunking bug in Firefox
docs: update architecture guide for v1.0
style: format CSS with consistent spacing
refactor: extract validation logic to separate module
perf: optimize fuzzy search algorithm
test: add P2P transfer test suite
chore: update Vite configuration
```

**Examples:**
```bash
git commit -m "feat: implement file chunking for large P2P transfers"
git commit -m "fix: prevent memory leak in PDF viewer on mobile"
git commit -m "test: add comprehensive store module test coverage"
git commit -m "refactor: split monolithic UI module into focused components"
```

## Project Structure

```
techbros/
├── public/               # Static assets and PWA files
│   ├── index.html       # Main HTML page
│   ├── app.js          # Application entry point
│   ├── manifest.json   # PWA manifest
│   ├── sw.js           # Service Worker
│   └── style.css       # Global styles
├── js/                  # ES6 modules
│   ├── store.js        # State management & search
│   ├── ui.js           # DOM manipulation & events
│   └── p2p.js          # Peer-to-peer file transfer
├── tests/               # Test files
│   ├── store.test.js   # Store module tests
│   ├── ui.test.js      # UI module tests
│   └── p2p.test.js     # P2P module tests
├── scripts/             # Development tools
│   └── add_resource.js # Resource ingestion script
├── docs/                # Documentation
│   ├── ARCHITECTURE.md # System design
│   └── CONTRIBUTING.md # This file
├── dist/                # Build output (generated)
├── package.json         # Dependencies and scripts
└── README.md           # Project overview
```

## Areas We Need Help With

- 🧪 **Testing**: Expand test coverage, add integration tests
- 📱 **Mobile UX**: Improve touch interactions and gestures
- 🌐 **Performance**: Optimize for slow networks and low-end devices
- ♿ **Accessibility**: Enhance keyboard navigation and screen reader support
- 🎨 **UI/UX**: Refine responsive design and visual polish
- 🐛 **Bug Fixes**: Address browser compatibility issues
- ✨ **Features**: Implement advanced P2P features, better search

## Questions?

Feel free to:
- Open an issue for discussion
- Check existing documentation
- Review the architecture guide

## Recognition

Contributors will be:
- Listed in future CONTRIBUTORS.md
- Mentioned in release notes
- Credited in commit history

Thank you for contributing to TechBros Library! 🙏

```javascript
// ✅ DO: Sanitize user input
element.textContent = userInput;

// ✅ DO: Validate files before P2P
const validation = validateFile(file);
if (!validation.valid) {
    showError(validation.error);
    return;
}

// ❌ DON'T: Use innerHTML with user data
element.innerHTML = `<div>${userInput}</div>`;

// ❌ DON'T: Trust file extensions alone
if (file.name.endsWith('.pdf')) {
    // Insufficient validation
}
```

### CSS

```css
/* ✅ DO: Use CSS variables */
.card {
    background: var(--surface);
    color: var(--text);
}

/* ✅ DO: Group related styles */
/* =========================================
   CARD COMPONENT
   ========================================= */
.card { /* ... */ }
.card-info { /* ... */ }
.card-thumbnail { /* ... */ }

/* ❌ DON'T: Use magic numbers */
.card {
    padding: 17px; /* Why 17? */
}

/* ❌ DON'T: Use !important */
.text {
    color: red !important; /* Avoid if possible */
}
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add export functionality for settings
fix: resolve XSS vulnerability in card rendering
docs: update README with deployment instructions
style: format code with prettier
refactor: extract P2P logic into separate module
perf: implement PDF lazy loading
test: add unit tests for fuzzy search
chore: update dependencies
```

**Examples:**

```bash
# Good commits
git commit -m "feat: add sidebar navigation with sub-pages"
git commit -m "fix: prevent memory leak in PDF rendering"
git commit -m "docs: add troubleshooting section to README"

# Bad commits
git commit -m "updates"
git commit -m "fixed stuff"
git commit -m "WIP"
```

## Testing Guidelines

### Manual Testing Checklist

Before submitting a PR, please test:

**Functionality:**
- [ ] All links and buttons work
- [ ] Search filters correctly
- [ ] Resources open properly
- [ ] P2P sharing sends/receives files
- [ ] Settings persist across sessions

**Browsers:**
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on Mac)
- [ ] Mobile browsers (responsive)

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] Screen reader friendly (if possible)

**Performance:**
- [ ] Large PDFs don't freeze browser
- [ ] Search is responsive
- [ ] No console errors
- [ ] Service Worker updates properly

## Project Structure

```
techbros/
├── public/               # Frontend code
│   ├── app.js           # Main application logic
│   ├── utils.js         # Utilities & security
│   ├── style.css        # Styling
│   ├── sw.js            # Service Worker
│   └── resources/       # Binary assets
├── scripts/             # Build/dev tools
│   └── add_resource.js  # Resource ingestion
├── docs/                # Documentation
│   └── ARCHITECTURE.md  # System design
└── README.md
```

## Areas We Need Help With

- 🧪 **Testing**: Write unit and integration tests
- 📝 **Documentation**: Improve guides and API docs
- 🌐 **Internationalization**: Add multi-language support
- ♿ **Accessibility**: Enhance screen reader support
- 🎨 **Design**: Improve UI/UX
- 🐛 **Bug Fixes**: Fix reported issues
- ✨ **Features**: Implement roadmap items

## Known Issues & Limitations

### Browser Console Warnings

The application may show the following console warnings that are **expected and non-critical**:

#### Service Worker Cache Errors
```
TypeError: Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported
```
**Cause**: Service worker attempting to cache browser extension requests (normal browser behavior)  
**Impact**: None - requests are safely filtered out  
**Status**: Fixed in v2.0.0 - service worker now only caches HTTP/HTTPS requests

#### Passive Event Listener Violations
```
[Violation] Added non-passive event listener to a scroll-blocking 'wheel' event
```
**Cause**: PDF.js library and embedded PDF documents use non-passive wheel event listeners  
**Impact**: Minor performance warning, no functional issues  
**Status**: Third-party library limitation - cannot be fixed without forking PDF.js

These warnings do not affect application functionality and can be safely ignored.

## Questions?

Feel free to:
- Open an issue for discussion
- Join our discussions
- Email: your.email@example.com

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in commit history

Thank you for contributing to TechBros Library! 🙏
