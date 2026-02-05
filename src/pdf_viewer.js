import * as pdfjsLib from 'pdfjs-dist';

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
        this.touchStartDist = 0;
        this.touchStartScale = 1;
        this.isPinching = false;
        this.currentTransform = 1;
    }

    async init() {
        this._renderUI();

        try {
            this.container.classList.add('loading');

            const loadingTask = pdfjsLib.getDocument({
                url: this.url,
                disableAutoFetch: true,
                disableStream: true,
            });

            this.pdfDoc = await loadingTask.promise;
            this.container.classList.remove('loading');

            this._updatePageLabel();
            this.renderPage(this.pageNum);

        } catch (error) {
            console.error('[PDFViewer] Error loading PDF:', error);
            this.container.classList.remove('loading');
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
                <button id="prev" class="btn-icon small" aria-label="Previous page" title="Previous (←)">
                    <i class="ph ph-caret-left"></i>
                </button>
                <div class="page-input-group">
                    <input type="number" id="page_input" min="1" value="1" aria-label="Page number" />
                    <span> / </span>
                    <span id="page_count" aria-live="polite">--</span>
                </div>
                <button id="next" class="btn-icon small" aria-label="Next page" title="Next (→)">
                    <i class="ph ph-caret-right"></i>
                </button>
            </div>
            <div class="pdf-zoom">
                <button id="fit_width" class="btn-icon small" aria-label="Fit to width" title="Fit Width">
                    <i class="ph ph-arrows-horizontal"></i>
                </button>
                <button id="zoom_out" class="btn-icon small" aria-label="Zoom out" title="Zoom Out (-)">
                    <i class="ph ph-minus"></i>
                </button>
                <span id="zoom_level" class="zoom-percentage">100%</span>
                <button id="zoom_in" class="btn-icon small" aria-label="Zoom in" title="Zoom In (+)">
                    <i class="ph ph-plus"></i>
                </button>
            </div>
            <div class="pdf-actions">
                <button id="download_pdf" class="btn-icon small" aria-label="Download PDF" title="Download">
                    <i class="ph ph-download-simple"></i>
                </button>
                <button id="print_pdf" class="btn-icon small" aria-label="Print PDF" title="Print">
                    <i class="ph ph-printer"></i>
                </button>
                <button id="shortcuts_help" class="btn-icon small" aria-label="Keyboard shortcuts" title="Shortcuts (?)">
                    <i class="ph ph-keyboard"></i>
                </button>
            </div>
        `;

        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'pdf-canvas-wrapper';

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        canvasWrapper.appendChild(this.canvas);

        this.container.appendChild(toolbar);
        this.container.appendChild(canvasWrapper);
        

        this.container.setAttribute('tabindex', '0');
        this.container.setAttribute('role', 'application');
        this.container.setAttribute('aria-label', 'PDF Viewer');
        
        this.container.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.onPrevPage();
                    break;
                case 'ArrowRight':
                case 'PageDown':
                    e.preventDefault();
                    this.onNextPage();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.fitToWidth = false;
                    this.scale = Math.min(3.0, this.scale + 0.2);
                    this.renderPage(this.pageNum);
                    break;
                case '-':
                    e.preventDefault();
                    this.fitToWidth = false;
                    this.scale = Math.max(0.5, this.scale - 0.2);
                    this.renderPage(this.pageNum);
                    break;
            }
        });

        toolbar.querySelector('#prev').addEventListener('click', () => this.onPrevPage());
        toolbar.querySelector('#next').addEventListener('click', () => this.onNextPage());

        const pageInput = toolbar.querySelector('#page_input');
        pageInput.addEventListener('change', (e) => {
            const pageNum = parseInt(e.target.value);
            if (pageNum >= 1 && pageNum <= this.pdfDoc.numPages) {
                this.pageNum = pageNum;
                this.queueRenderPage(this.pageNum);
            } else {
                e.target.value = this.pageNum;
            }
        });

        toolbar.querySelector('#fit_width').addEventListener('click', () => {
            this.fitToWidth = true;
            this.scale = 1.0;
            this.renderPage(this.pageNum);
        });

        toolbar.querySelector('#zoom_out').addEventListener('click', () => {
            this.fitToWidth = false;
            this.scale = Math.max(0.5, this.scale - 0.2);
            this.renderPage(this.pageNum);
        });
        toolbar.querySelector('#zoom_in').addEventListener('click', () => {
            this.fitToWidth = false;
            this.scale = Math.min(3.0, this.scale + 0.2);
            this.renderPage(this.pageNum);
        });

        toolbar.querySelector('#download_pdf').addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = this.url;
            link.download = 'document.pdf';
            link.click();
        });

        toolbar.querySelector('#print_pdf').addEventListener('click', () => {
            window.open(this.url, '_blank');
        });

        toolbar.querySelector('#shortcuts_help').addEventListener('click', () => {
            this._showShortcutsDialog();
        });

        this.pageInput = pageInput;
        this.zoomLabel = toolbar.querySelector('#zoom_level');
        this._setupInteraction(canvasWrapper);
    }

    _showShortcutsDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'shortcuts-dialog';
        dialog.innerHTML = `
            <div class="shortcuts-content">
                <h3>Keyboard Shortcuts</h3>
                <div class="shortcuts-list">
                    <div class="shortcut-item">
                        <kbd>←</kbd><kbd>→</kbd>
                        <span>Previous / Next page</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>+</kbd><kbd>-</kbd>
                        <span>Zoom in / out</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl</kbd> + <kbd>Wheel</kbd>
                        <span>Zoom with mouse</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Space</kbd>
                        <span>Scroll down</span>
                    </div>
                </div>
                <button class="btn secondary" id="close-shortcuts">Got it</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const closeBtn = dialog.querySelector('#close-shortcuts');
        closeBtn.addEventListener('click', () => dialog.remove());
        
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.remove();
        });
    }

    _setupInteraction(element) {
        element.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                this.isPinching = true;
                this.touchStartDist = this._getTouchDistance(e.touches);
                this.touchStartScale = this.scale;
                e.preventDefault();
            }
        }, { passive: false });

        element.addEventListener('touchmove', (e) => {
            if (this.isPinching && e.touches.length === 2) {
                const dist = this._getTouchDistance(e.touches);
                const ratio = dist / this.touchStartDist;
                this.currentTransform = Math.max(0.5, Math.min(3.0, this.touchStartScale * ratio));
                const cssScale = ratio;
                this.canvas.style.transform = `scale(${cssScale})`;
                this.canvas.style.transformOrigin = 'center center';

                e.preventDefault();
            }
        }, { passive: false });

        element.addEventListener('touchend', (e) => {
            if (this.isPinching && e.touches.length < 2) {
                this.isPinching = false;
                if (this.currentTransform) {
                    this.scale = this.currentTransform;
                    this.canvas.style.transform = 'none';
                    this.renderPage(this.pageNum);
                }
            }
        });

        element.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();

                const delta = e.deltaY * -0.01;
                const newScale = Math.min(Math.max(0.5, this.scale + delta), 3.0);

                if (Math.abs(newScale - this.scale) > 0.1) {
                    this.scale = newScale;
                    this.renderPage(this.pageNum);
                }
            }
        }, { passive: false });
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
            const wrapper = this.container.querySelector('.pdf-canvas-wrapper');

            if (this.scale === 1.0 && wrapper && !this.isPinching) {
                const availWidth = wrapper.clientWidth || window.innerWidth;
                const baseViewport = page.getViewport({ scale: 1.0 });
                if (baseViewport.width > availWidth - 20) {
                    this.scale = (availWidth - 20) / baseViewport.width;
                }
            }

            const viewport = page.getViewport({ scale: this.scale });
            const outputScale = window.devicePixelRatio || 1;

            this.canvas.width = Math.floor(viewport.width * outputScale);
            this.canvas.height = Math.floor(viewport.height * outputScale);
            this.canvas.style.width = Math.floor(viewport.width) + "px";
            this.canvas.style.height = Math.floor(viewport.height) + "px";

            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport,
                transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
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

        if (this.pageInput) this.pageInput.value = num;
        if (this.zoomLabel) this.zoomLabel.textContent = `${Math.round(this.scale * 100)}%`;
        this._updatePageLabel();
        this._prefetchNextPage(num + 1);
    }

    _prefetchNextPage(num) {
        if (this.pdfDoc && num <= this.pdfDoc.numPages) {
            this.pdfDoc.getPage(num).then(page => {
            }).catch(() => {});
        }
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
    
    cleanup() {
        const prevBtn = this.container.querySelector('#prev');
        const nextBtn = this.container.querySelector('#next');
        
        if (prevBtn) prevBtn.replaceWith(prevBtn.cloneNode(true));
        if (nextBtn) nextBtn.replaceWith(nextBtn.cloneNode(true));
        
        if (this.pdfDoc) {
            this.pdfDoc.destroy && this.pdfDoc.destroy();
            this.pdfDoc = null;
        }
        
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.canvas = null;
        this.ctx = null;
        this.container = null;
    }
}
