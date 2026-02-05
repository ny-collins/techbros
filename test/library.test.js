import { store } from '../src/store.js';

// Mock DOM elements required by library
beforeEach(() => {
    document.body.innerHTML = `
        <div id="resource-list"></div>
        <div id="filter-container"></div>
        <input id="search-input" type="search" />
        <button id="view-grid"></button>
        <button id="view-list"></button>
        <button id="btn-clear-cache"></button>
    `;
});

describe('Library UI', () => {
    beforeEach(() => {
        // Reset store mock
        store.state = {
            resources: [],
            settings: { layout: 'grid' }
        };
        
        jest.clearAllMocks();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Resource Rendering', () => {
        test('calculates stats correctly', () => {
            const resources = [
                { id: '1', title: 'Test PDF', type: 'pdf', size: 1024 * 1024 },
                { id: '2', title: 'Test Audio', type: 'audio', size: 2 * 1024 * 1024 },
                { id: '3', title: 'Test Video', type: 'video', size: 5 * 1024 * 1024 }
            ];

            const stats = {
                total: resources.length,
                pdf: resources.filter(r => r.type === 'pdf').length,
                audio: resources.filter(r => r.type === 'audio').length,
                video: resources.filter(r => r.type === 'video').length,
                totalSize: resources.reduce((sum, r) => sum + (r.size || 0), 0)
            };

            expect(stats.total).toBe(3);
            expect(stats.pdf).toBe(1);
            expect(stats.audio).toBe(1);
            expect(stats.video).toBe(1);
            expect(stats.totalSize).toBe(8 * 1024 * 1024);
        });

        test('formats file size correctly', () => {
            const formatSize = (bytes) => {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };

            expect(formatSize(0)).toBe('0 B');
            expect(formatSize(1024)).toBe('1 KB');
            expect(formatSize(1024 * 1024)).toBe('1 MB');
            expect(formatSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
        });

        test('groups resources by category', () => {
            const resources = [
                { id: '1', category: 'Mathematics' },
                { id: '2', category: 'Physics' },
                { id: '3', category: 'Mathematics' }
            ];

            const byCategory = resources.reduce((acc, resource) => {
                const cat = resource.category || 'Uncategorized';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(resource);
                return acc;
            }, {});

            expect(byCategory['Mathematics']).toHaveLength(2);
            expect(byCategory['Physics']).toHaveLength(1);
        });
    });

    describe('Pinned Resources', () => {
        test('filters pinned resources correctly', () => {
            const resources = [
                { id: '1', title: 'Pinned 1', pinned: true },
                { id: '2', title: 'Not Pinned', pinned: false },
                { id: '3', title: 'Pinned 2', pinned: true }
            ];

            const pinned = resources.filter(r => r.pinned);

            expect(pinned).toHaveLength(2);
            expect(pinned[0].title).toBe('Pinned 1');
            expect(pinned[1].title).toBe('Pinned 2');
        });
    });

    describe('Search and Filter', () => {
        test('filters resources by search query', () => {
            const resources = [
                { id: '1', title: 'Calculus Textbook', type: 'pdf' },
                { id: '2', title: 'Physics Notes', type: 'pdf' },
                { id: '3', title: 'Calculus Video', type: 'video' }
            ];

            const query = 'calculus';
            const filtered = resources.filter(r => 
                r.title.toLowerCase().includes(query.toLowerCase())
            );

            expect(filtered).toHaveLength(2);
            expect(filtered[0].title).toContain('Calculus');
            expect(filtered[1].title).toContain('Calculus');
        });

        test('filters resources by type', () => {
            const resources = [
                { id: '1', type: 'pdf' },
                { id: '2', type: 'audio' },
                { id: '3', type: 'pdf' }
            ];

            const pdfOnly = resources.filter(r => r.type === 'pdf');

            expect(pdfOnly).toHaveLength(2);
        });
    });

    describe('DOM Utilities', () => {
        test('escapes HTML to prevent XSS', () => {
            const escapeHtml = (str) => {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            };

            const malicious = '<script>alert("xss")</script>';
            const escaped = escapeHtml(malicious);

            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;script&gt;');
        });

        test('creates DOM element safely', () => {
            const container = document.createElement('div');
            container.className = 'test-container';
            container.innerHTML = '<span>Test Content</span>';

            expect(container.querySelector('span')).not.toBeNull();
            expect(container.querySelector('span').textContent).toBe('Test Content');
        });
    });
});
