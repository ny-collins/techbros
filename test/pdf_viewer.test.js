import { PDFViewer } from '../src/pdf_viewer.js';

jest.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: jest.fn(() => ({
        promise: Promise.resolve({
            numPages: 5,
            getPage: jest.fn(() => Promise.resolve({
                getViewport: jest.fn(() => ({ width: 600, height: 800 })),
                render: jest.fn(() => ({ promise: Promise.resolve() }))
            }))
        })
    }))
}));

describe('PDFViewer', () => {
    let container;
    let viewer;

    beforeEach(() => {
        container = document.createElement('div');
        viewer = new PDFViewer(container, 'mock.pdf');

        HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
            drawImage: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            scale: jest.fn()
        }));
    });

    test('initializes and renders UI', async () => {
        await viewer.init();

        expect(container.querySelector('.pdf-toolbar')).not.toBeNull();
        expect(container.querySelector('canvas')).not.toBeNull();
        expect(container.querySelector('#page_count').textContent).toBe('5');
        expect(container.querySelector('#page_input').value).toBe('1');
    });

    test('navigates pages', async () => {
        await viewer.init();

        viewer.onNextPage();
        expect(viewer.pageNum).toBe(2);

        viewer.onPrevPage();
        expect(viewer.pageNum).toBe(1);
    });

    test('handles zoom', async () => {
        await viewer.init();
        const initialScale = viewer.scale;

        container.querySelector('#zoom_in').click();
        expect(viewer.scale).toBeGreaterThan(initialScale);

        container.querySelector('#zoom_out').click();
        expect(viewer.scale).toBe(initialScale);
    });
});
