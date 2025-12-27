# Contributing to TechBros Library

Thank you for your interest in contributing to TechBros Library. This project adheres to a standard of professional engineering practices to ensure stability, security, and maintainability.

## Code of Conduct

All contributors are expected to interact respectfully and professionally. Technical disagreements should be resolved through objective analysis and data.

## Workflow

### Reporting Issues

Please file bug reports using the issue tracker. A valid bug report must include:
1.  **Environment:** Browser version, OS, Device type.
2.  **Reproduction Steps:** A minimal, numbered list of actions to trigger the bug.
3.  **Expected vs. Actual:** Clear description of the discrepancy.
4.  **Logs:** Relevant console output or network traces.

### Feature Requests

Enhancement proposals should define:
1.  **Problem Statement:** What user need is currently unmet?
2.  **Proposed Solution:** Technical description of the feature.
3.  **Alternatives:** Other approaches considered and why they were rejected.

### Pull Request Process

1.  **Branching:** Create feature branches from `main` (e.g., `feat/offline-qr`).
2.  **Standards:** Ensure code adheres to the [Coding Standards](#coding-standards) defined below.
3.  **Testing:** Run the full test suite (`npm test`) locally. New features must include unit tests.
4.  **Documentation:** Update `ARCHITECTURE.md` if architectural changes are made.
5.  **Review:** Submit a Pull Request (PR) with a descriptive title and body.

## Development Environment

**Prerequisites:** Node.js v16+

```bash
# Setup
git clone https://github.com/ny-collins/techbros.git
cd techbros
npm install

# Development
npm run dev

# Testing
npm test
```

## Coding Standards

### General Principles
*   **Self-Documenting Code:** Variable and function names must be explicit. Comments should explain *why*, not *what*.
*   **Modularity:** Maintain strict separation of concerns (Store vs UI vs Network).
*   **No Magic Numbers:** Use named constants for timeouts, limits, and configuration values.

### JavaScript
*   Use modern ES6+ syntax (const/let, arrow functions, async/await).
*   Avoid global state outside the `Store` module.
*   Prioritize `textContent` over `innerHTML` to prevent XSS.

### Security
*   **Input Validation:** Sanitize all external data (P2P signals, user input).
*   **CSP Compliance:** Ensure no inline styles or scripts violate the Content Security Policy.

## Project Structure

*   `src/`: Application source code (ES Modules).
*   `public/`: Static assets (images, manifest, service worker).
*   `tests/`: Jest unit and integration tests.
*   `docs/`: Technical documentation.

## Testing Guidelines

*   **Unit Tests:** Required for all logic modules (`store.js`, `p2p.js`).
*   **Mocking:** Network requests (fetch, WebRTC) must be mocked.
*   **Coverage:** New code should maintain or improve test coverage.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.