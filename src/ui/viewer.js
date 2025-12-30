import { common } from './common.js';
import { PDFViewer } from '../pdf-viewer.js';

export const viewer = {
    elements: {
        container: document.getElementById('player-container'),
        backButton: document.getElementById('btn-back-library'),
    },

    /* === INITIALIZATION === */

    init(router) {
        if (this.elements.backButton) {
            this.elements.backButton.addEventListener('click', () => {
                this.clear();
                if (window.snowSystem) window.snowSystem.resume();
                router.navigateTo('library');
            });
        }
    },

    open(resource, router) {
        common.closeSidebar();
        this.clear();

        if (window.snowSystem) window.snowSystem.resume();

        const container = this.elements.container;
        if (!container) return;

        // Reset container styles potentially set by image viewer
        container.style.overflow = '';
        container.style.display = '';
        container.style.alignItems = '';
        container.style.justifyContent = '';

        if (resource.type === 'audio') {
            this._renderAudio(resource, container);
        } else if (resource.type === 'video') {
            this._renderVideo(resource, container);
        } else if (resource.type === 'pdf') {
            if (window.snowSystem) window.snowSystem.pause();
            this._renderPDF(resource, container);
        } else if (resource.type === 'image') {
            this._renderImage(resource, container);
        } else if (resource.type === 'text') {
            this._renderText(resource, container);
        } else {
            this._renderGeneric(resource, container);
        }

        router.navigateTo('resource');
    },

    /* === RENDERERS === */

    async _renderText(resource, container) {
        container.innerHTML = '<div class="loading-bar"><div class="loading-progress"></div></div>';
        
        try {
            const response = await fetch(resource.url);
            if (!response.ok) throw new Error('Failed to load text');
            const text = await response.text();

            const pre = document.createElement('pre');
            pre.style.padding = '2rem';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.fontFamily = 'monospace';
            pre.style.color = 'var(--text-main)';
            pre.style.overflow = 'auto';
            pre.style.height = '100%';
            pre.textContent = text;
            
            container.innerHTML = '';
            container.appendChild(pre);
        } catch (e) {
            common.showToast('Could not load text file', 'error');
            this._renderGeneric(resource, container);
        }
    },

    _renderGeneric(resource, container) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.height = '100%';
        wrapper.style.gap = '2rem';

        const icon = document.createElement('i');
        icon.className = 'ph ph-file';
        if (resource.type === 'archive') icon.className = 'ph ph-file-archive';
        if (resource.type === 'document') icon.className = 'ph ph-file-doc';
        icon.style.fontSize = '8rem';
        icon.style.color = 'var(--primary)';

        const msg = document.createElement('p');
        msg.textContent = 'This file type cannot be previewed.';
        msg.style.color = 'var(--text-muted)';

        const btn = document.createElement('a');
        btn.href = resource.url;
        btn.download = resource.title;
        btn.className = 'btn primary';
        btn.innerHTML = '<i class="ph ph-download-simple"></i> Download File';

        wrapper.appendChild(icon);
        wrapper.appendChild(msg);
        wrapper.appendChild(btn);
        container.appendChild(wrapper);
    },

    _renderAudio(resource, container) {
        const card = document.createElement('div');
        card.className = 'audio-player-card';

        const coverContainer = document.createElement('div');
        if (resource.cover) {
            const img = document.createElement('img');
            img.src = resource.cover;
            img.className = 'player-cover-art';
            img.alt = 'Cover';
            img.addEventListener('error', () => {
                coverContainer.innerHTML = '';
                coverContainer.appendChild(this._createAudioFallback());
            });
            coverContainer.appendChild(img);
        } else {
            coverContainer.appendChild(this._createAudioFallback());
        }

        const metaDiv = document.createElement('div');
        metaDiv.className = 'player-meta';
        const title = document.createElement('h2');
        title.textContent = common.sanitizeText(resource.title);
        metaDiv.appendChild(title);

        const audio = document.createElement('audio');
        audio.controls = true;
        audio.autoplay = true;
        audio.src = resource.url;

        card.appendChild(coverContainer);
        card.appendChild(metaDiv);
        card.appendChild(audio);

        container.appendChild(card);
    },

    _renderVideo(resource, container) {
        const video = document.createElement('video');
        video.className = 'full-viewer';
        video.controls = true;
        video.autoplay = true;
        video.src = resource.url;
        video.onerror = () => common.showToast('Error loading video', 'error');
        container.appendChild(video);
    },

    _renderPDF(resource, container) {
        const pdfContainer = document.createElement('div');
        pdfContainer.className = 'full-viewer pdf-viewer-root';
        container.appendChild(pdfContainer);
        const pdfViewer = new PDFViewer(pdfContainer, resource.url);
        pdfViewer.init();
    },

    _renderImage(resource, container) {
        const img = document.createElement('img');
        img.src = resource.url;
        img.onerror = () => {
            img.style.display = 'none';
            common.showToast('Error loading image', 'error');
        };

        let scale = 1;
        let lastScale = 1;
        let startDist = 0;
        let isPinching = false;
        let posX = 0, posY = 0;
        let lastX = 0, lastY = 0;

        img.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isPinching = true;
                startDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                lastScale = scale;
            } else if (e.touches.length === 1) {
                lastX = e.touches[0].clientX - posX;
                lastY = e.touches[0].clientY - posY;
            }
        });

        img.addEventListener('touchmove', (e) => {
            if (isPinching && e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                scale = Math.min(Math.max(1, lastScale * (dist / startDist)), 4);
                img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
                e.preventDefault();
            } else if (!isPinching && e.touches.length === 1 && scale > 1) {
                posX = e.touches[0].clientX - lastX;
                posY = e.touches[0].clientY - lastY;
                img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
                e.preventDefault();
            }
        }, { passive: false });

        img.addEventListener('touchend', () => {
            isPinching = false;
        });

        container.style.overflow = 'hidden';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';

        container.appendChild(img);
    },

    _createAudioFallback() {
        const div = document.createElement('div');
        div.className = 'audio-fallback';
        div.innerHTML = '<i class="ph ph-music-note"></i>';
        return div;
    }
};
