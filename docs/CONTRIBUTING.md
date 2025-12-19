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
3. **Test thoroughly** on multiple browsers
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

# Start development server
npm run dev

# Add resources (if testing ingestion)
npm run add
```

## Coding Standards

### JavaScript

```javascript
// ✅ DO: Use ES6+ features
const resources = allResources.filter(item => item.type === 'pdf');

// ✅ DO: Use descriptive variable names
const userSettings = getUserSettings();

// ❌ DON'T: Use var
var x = 10;

// ❌ DON'T: Use unclear names
const fn = () => {};
```

### Functions

```javascript
// ✅ DO: Add JSDoc comments
/**
 * Validates a file for P2P transfer
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error: string|null}}
 */
function validateFile(file) {
    // ...
}

// ✅ DO: Keep functions focused (single responsibility)
function renderCard(item) {
    // Only renders a card, doesn't fetch data
}

// ❌ DON'T: Create giant functions
function doEverything() {
    // 500 lines of code
}
```

### Security

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
