import { common } from './common.js';
import { PDFViewer } from '../pdf-viewer.js';

export const viewer = {
    elements: {
        container: document.getElementById('player-container'),
        backButton: document.getElementById('btn-back-library'),
    },

    init(router) {
        if (this.elements.backButton) {
            this.elements.backButton.addEventListener('click', () => {
                this.clear();
                router.navigateTo('library');
            });
        }
    },

    open(resource, router) {
        common.closeSidebar();
        this.clear();

        const container = this.elements.container;
        if (!container) return;

        if (resource.type === 'audio') {
            this._renderAudio(resource, container);
        } else if (resource.type === 'video') {
            this._renderVideo(resource, container);
        } else if (resource.type === 'pdf') {
            this._renderPDF(resource, container);
        } else {
            this._renderImage(resource, container);
        }

        router.navigateTo('resource');
    },

    clear() {
        if (this.elements.container) this.elements.container.innerHTML = '';
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
        img.style.maxWidth = '100%'; 
        img.style.maxHeight = '90vh';
        img.onerror = () => {
            img.style.display = 'none';
            common.showToast('Error loading image', 'error');
        };
        container.appendChild(img);
    },

    _createAudioFallback() {
        const div = document.createElement('div');
        div.className = 'audio-fallback';
        div.innerHTML = '<i class="ph ph-music-note"></i>';
        return div;
    }
};
