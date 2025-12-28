import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to the local file we just updated
pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';

export class PDFViewer {
    constructor(container, url) {
        this.container = container;
        this.url = url;
        this.pdfDoc = null;
        this.pageNum = 1;
        this.pageRendering = false;
        this.pageNumPending = null;
        this.scale = 1.0;
        this.canvas = null;
        this.ctx = null;
        this.pageLabel = null;
        
        // Touch State
        this.touchStartDist = 0;
        this.touchStartScale = 1;
        this.isPinching = false;
    }

    async init() {
        this._renderUI();
        
        try {
            this.container.classList.add('loading');
            this.pdfDoc = await pdfjsLib.getDocument(this.url).promise;
            this.container.classList.remove('loading');
            
            // Update page count label
            this._updatePageLabel();
            
            // Initial render
            this.renderPage(this.pageNum);
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.container.innerHTML = `
                <div class="error-state">
                    <i class="ph ph-warning-circle"></i>
                    <p>Failed to load PDF.</p>
                    <a href="${this.url}" target="_blank" class="btn secondary">Open Externally</a>
                </div>
            `;
        }
    }

    _renderUI() {
        this.container.innerHTML = '';
        this.container.className = 'pdf-viewer-container';

        const toolbar = document.createElement('div');
        toolbar.className = 'pdf-toolbar';
        toolbar.innerHTML = `
            <div class="pdf-controls">
                <button id="prev" class="btn-icon small"><i class="ph ph-caret-left"></i></button>
                <span id="page_num">Page 1</span> / <span id="page_count">--</span>
                <button id="next" class="btn-icon small"><i class="ph ph-caret-right"></i></button>
            </div>
            <div class="pdf-zoom">
                <button id="zoom_out" class="btn-icon small"><i class="ph ph-minus"></i></button>
                <button id="zoom_in" class="btn-icon small"><i class="ph ph-plus"></i></button>
            </div>
        `;

        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'pdf-canvas-wrapper';
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        canvasWrapper.appendChild(this.canvas);

        this.container.appendChild(toolbar);
        this.container.appendChild(canvasWrapper);

        // Bind Events
        toolbar.querySelector('#prev').addEventListener('click', () => this.onPrevPage());
        toolbar.querySelector('#next').addEventListener('click', () => this.onNextPage());
        toolbar.querySelector('#zoom_out').addEventListener('click', () => { this.scale -= 0.1; this.renderPage(this.pageNum); });
        toolbar.querySelector('#zoom_in').addEventListener('click', () => { this.scale += 0.1; this.renderPage(this.pageNum); });
        
        this.pageLabel = toolbar.querySelector('#page_num');

        this._setupTouchEvents(canvasWrapper);
    }

    _setupTouchEvents(element) {
        element.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                this.isPinching = true;
                this.touchStartDist = this._getTouchDistance(e.touches);
                this.touchStartScale = this.scale;
                e.preventDefault(); // Prevent default browser zoom
            }
        }, { passive: false });

        element.addEventListener('touchmove', (e) => {
            if (this.isPinching && e.touches.length === 2) {
                const dist = this._getTouchDistance(e.touches);
                const ratio = dist / this.touchStartDist;
                
                // Limit zoom levels
                const newScale = Math.min(Math.max(0.5, this.touchStartScale * ratio), 3.0);
                
                // Only re-render if scale changed significantly (performance optimization)
                if (Math.abs(newScale - this.scale) > 0.05) {
                    this.scale = newScale;
                    this.renderPage(this.pageNum);
                }
                e.preventDefault();
            }
        }, { passive: false });

        element.addEventListener('touchend', (e) => {
            if (this.isPinching && e.touches.length < 2) {
                this.isPinching = false;
            }
        });
    }

    _getTouchDistance(touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    }

    async renderPage(num) {
        this.pageRendering = true;
        
        try {
            const page = await this.pdfDoc.getPage(num);
            
            // Determine scale based on container width if it's the first load or reset
            const viewport = page.getViewport({ scale: this.scale });
            
            // Responsive scaling: Fit width only on first load (if scale is default 1.0)
            const wrapper = this.container.querySelector('.pdf-canvas-wrapper');
            if (this.scale === 1.0 && wrapper) {
                const availWidth = wrapper.clientWidth || window.innerWidth;
                const baseViewport = page.getViewport({ scale: 1.0 });
                // If PDF is wider than screen, fit it. 
                // We update this.scale so subsequent renders respect it.
                if (baseViewport.width > availWidth) {
                    this.scale = (availWidth - 40) / baseViewport.width; // -40 for padding
                    // Re-calculate viewport with new scale
                    return this.renderPage(num);
                }
            }

            this.canvas.height = viewport.height;
            this.canvas.width = viewport.width;

            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };
            
            const renderTask = page.render(renderContext);

            await renderTask.promise;
            this.pageRendering = false;
            
            if (this.pageNumPending !== null) {
                this.renderPage(this.pageNumPending);
                this.pageNumPending = null;
            }
        } catch (e) {
            console.error(e);
            this.pageRendering = false;
        }

        this.pageLabel.textContent = `Page ${num}`;
        this._updatePageLabel();
    }

    queueRenderPage(num) {
        if (this.pageRendering) {
            this.pageNumPending = num;
        } else {
            this.renderPage(num);
        }
    }

    onPrevPage() {
        if (this.pageNum <= 1) return;
        this.pageNum--;
        this.queueRenderPage(this.pageNum);
    }

    onNextPage() {
        if (this.pageNum >= this.pdfDoc.numPages) return;
        this.pageNum++;
        this.queueRenderPage(this.pageNum);
    }

    _updatePageLabel() {
        const countSpan = this.container.querySelector('#page_count');
        if (countSpan && this.pdfDoc) countSpan.textContent = this.pdfDoc.numPages;
    }
}
