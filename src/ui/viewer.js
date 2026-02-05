import { common } from './common.js';
import { PDFViewer } from '../pdf_viewer.js';

export const viewer = {
    elements: {
        container: document.getElementById('player-container'),
        backButton: document.getElementById('btn-back-library'),
        infoPanel: null,
    },

    currentResource: null,

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

    clear() {
        if (this.elements.container) {
            this.elements.container.innerHTML = '';
        }
        
        this._cleanupCurrentViewer();
    },
    
    _cleanupCurrentViewer() {
        if (this.currentPDFViewer) {
            this.currentPDFViewer.cleanup && this.currentPDFViewer.cleanup();
            this.currentPDFViewer = null;
        }
        
        const mediaElements = this.elements.container?.querySelectorAll('audio, video');
        if (mediaElements) {
            mediaElements.forEach(el => {
                el.pause();
                el.src = '';
                el.load();
            });
        }
    },

    open(resource, router) {
        common.closeSidebar();
        this.clear();
        this.currentResource = resource;

        if (window.snowSystem) window.snowSystem.resume();

        const container = this.elements.container;
        if (!container) return;

        this._createFileInfoPanel(resource);

        container.style.overflow = '';
        container.style.display = '';
        container.style.alignItems = '';
        container.style.justifyContent = '';

        this._showLoadingState(resource);

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

    _createFileInfoPanel(resource) {
        if (this.elements.infoPanel) {
            this.elements.infoPanel.remove();
        }

        const panel = document.createElement('div');
        panel.className = 'file-info-panel';
        
        const size = resource.size ? common.formatBytes(resource.size) : 'Unknown';
        const type = resource.type.toUpperCase();
        const added = resource.added ? new Date(resource.added).toLocaleDateString() : 'Unknown';
        
        panel.innerHTML = `
            <button class="info-toggle" aria-label="Toggle file info">
                <i class="ph ph-info"></i>
            </button>
            <div class="info-content">
                <h4>${common.sanitizeText(resource.title)}</h4>
                <div class="info-meta">
                    <span><i class="ph ph-file"></i> ${type}</span>
                    <span><i class="ph ph-package"></i> ${size}</span>
                    <span><i class="ph ph-calendar"></i> ${added}</span>
                </div>
                <div class="info-actions">
                    <a href="${resource.url}" download="${resource.title}" class="btn-action" title="Download">
                        <i class="ph ph-download-simple"></i>
                    </a>
                    <button class="btn-action" id="btn-share-resource" title="Share">
                        <i class="ph ph-share-network"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.elements.infoPanel = panel;
        
        const toggleBtn = panel.querySelector('.info-toggle');
        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('expanded');
        });
        
        const shareBtn = panel.querySelector('#btn-share-resource');
        shareBtn.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: resource.title,
                    url: resource.url
                }).catch(() => {});
            } else {
                navigator.clipboard.writeText(resource.url);
                common.showToast('Link copied to clipboard', 'success');
            }
        });
    },

    _showLoadingState(resource) {
        const container = this.elements.container;
        const loader = document.createElement('div');
        loader.className = 'viewer-loading';
        loader.innerHTML = `
            <div class="spinner"></div>
            <p>Loading ${resource.type}...</p>
        `;
        container.appendChild(loader);
        
        setTimeout(() => {
            const existingLoader = container.querySelector('.viewer-loading');
            if (existingLoader) existingLoader.remove();
        }, 5000);
    },

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
        const loader = container.querySelector('.viewer-loading');
        if (loader) loader.remove();

        const card = document.createElement('div');
        card.className = 'audio-player-card';

        const coverContainer = document.createElement('div');
        coverContainer.className = 'audio-cover-container';
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

        if (resource.artist || resource.album) {
            const subtitle = document.createElement('p');
            subtitle.className = 'audio-subtitle';
            subtitle.textContent = [resource.artist, resource.album].filter(Boolean).join(' • ');
            metaDiv.appendChild(subtitle);
        }

        const audio = document.createElement('audio');
        audio.controls = true;
        audio.autoplay = true;
        audio.src = resource.url;
        audio.controlsList = 'nodownload';

        const speedControl = document.createElement('div');
        speedControl.className = 'playback-speed-control';
        speedControl.innerHTML = `
            <label for="playback-speed">Speed:</label>
            <select id="playback-speed">
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
            </select>
        `;
        
        speedControl.querySelector('select').addEventListener('change', (e) => {
            audio.playbackRate = parseFloat(e.target.value);
        });

        card.appendChild(coverContainer);
        card.appendChild(metaDiv);
        card.appendChild(audio);
        card.appendChild(speedControl);

        container.appendChild(card);
    },

    _renderVideo(resource, container) {
        const loader = container.querySelector('.viewer-loading');
        if (loader) loader.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'video-player-wrapper';

        const video = document.createElement('video');
        video.className = 'full-viewer';
        video.controls = true;
        video.autoplay = true;
        video.src = resource.url;
        video.onerror = () => common.showToast('Error loading video', 'error');
        
        wrapper.appendChild(video);

        const speedControl = document.createElement('div');
        speedControl.className = 'video-speed-control';
        speedControl.innerHTML = `
            <button class="speed-btn" data-speed="0.5">0.5x</button>
            <button class="speed-btn active" data-speed="1">1x</button>
            <button class="speed-btn" data-speed="1.5">1.5x</button>
            <button class="speed-btn" data-speed="2">2x</button>
        `;
        
        speedControl.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                video.playbackRate = parseFloat(btn.dataset.speed);
                speedControl.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        wrapper.appendChild(speedControl);
        container.appendChild(wrapper);
    },

    _renderPDF(resource, container) {
        this._cleanupCurrentViewer();
        
        const pdfContainer = document.createElement('div');
        pdfContainer.className = 'full-viewer pdf-viewer-root';
        container.appendChild(pdfContainer);
        this.currentPDFViewer = new PDFViewer(pdfContainer, resource.url);
        this.currentPDFViewer.init();
    },

    _renderImage(resource, container) {
        const loader = container.querySelector('.viewer-loading');
        if (loader) loader.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'image-viewer-wrapper';

        const img = document.createElement('img');
        img.src = resource.url;
        img.onerror = () => {
            img.style.display = 'none';
            common.showToast('Error loading image', 'error');
        };

        let scale = 1;
        let rotation = 0;
        let lastScale = 1;
        let startDist = 0;
        let isPinching = false;
        let posX = 0, posY = 0;
        let lastX = 0, lastY = 0;

        const updateTransform = () => {
            img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`;
            zoomLabel.textContent = `${Math.round(scale * 100)}%`;
        };

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
                scale = Math.min(Math.max(0.5, lastScale * (dist / startDist)), 5);
                updateTransform();
                e.preventDefault();
            } else if (!isPinching && e.touches.length === 1 && scale > 1) {
                posX = e.touches[0].clientX - lastX;
                posY = e.touches[0].clientY - lastY;
                updateTransform();
                e.preventDefault();
            }
        }, { passive: false });

        img.addEventListener('touchend', () => {
            isPinching = false;
        });

        const controls = document.createElement('div');
        controls.className = 'image-controls';
        controls.innerHTML = `
            <button class="btn-icon" id="zoom-out" title="Zoom Out">
                <i class="ph ph-minus"></i>
            </button>
            <span id="zoom-label">100%</span>
            <button class="btn-icon" id="zoom-in" title="Zoom In">
                <i class="ph ph-plus"></i>
            </button>
            <div class="control-divider"></div>
            <button class="btn-icon" id="rotate-left" title="Rotate Left">
                <i class="ph ph-arrow-counter-clockwise"></i>
            </button>
            <button class="btn-icon" id="rotate-right" title="Rotate Right">
                <i class="ph ph-arrow-clockwise"></i>
            </button>
            <button class="btn-icon" id="reset-view" title="Reset View">
                <i class="ph ph-arrows-in"></i>
            </button>
        `;

        const zoomLabel = controls.querySelector('#zoom-label');

        controls.querySelector('#zoom-in').addEventListener('click', () => {
            scale = Math.min(5, scale + 0.25);
            updateTransform();
        });

        controls.querySelector('#zoom-out').addEventListener('click', () => {
            scale = Math.max(0.5, scale - 0.25);
            updateTransform();
        });

        controls.querySelector('#rotate-left').addEventListener('click', () => {
            rotation -= 90;
            updateTransform();
        });

        controls.querySelector('#rotate-right').addEventListener('click', () => {
            rotation += 90;
            updateTransform();
        });

        controls.querySelector('#reset-view').addEventListener('click', () => {
            scale = 1;
            rotation = 0;
            posX = 0;
            posY = 0;
            updateTransform();
        });

        wrapper.appendChild(img);
        wrapper.appendChild(controls);

        container.style.overflow = 'hidden';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';

        container.appendChild(wrapper);
    },

    _createAudioFallback() {
        const div = document.createElement('div');
        div.className = 'audio-fallback';
        div.innerHTML = '<i class="ph ph-music-note"></i>';
        return div;
    }
};
