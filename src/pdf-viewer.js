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

        toolbar.querySelector('#prev').addEventListener('click', () => this.onPrevPage());
        toolbar.querySelector('#next').addEventListener('click', () => this.onNextPage());

        toolbar.querySelector('#zoom_out').addEventListener('click', () => {
            this.scale = Math.max(0.5, this.scale - 0.2);
            this.renderPage(this.pageNum);
        });
        toolbar.querySelector('#zoom_in').addEventListener('click', () => {
            this.scale = Math.min(3.0, this.scale + 0.2);
            this.renderPage(this.pageNum);
        });

        this.pageLabel = toolbar.querySelector('#page_num');
        this._setupInteraction(canvasWrapper);
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

        this.pageLabel.textContent = `Page ${num}`;
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
}
