// public/app.js

// ==========================================
// 1. STATE MANAGEMENT & DOM ELEMENTS
// ==========================================
let allResources = [];

const libraryView = document.getElementById('library-view');
const viewerView = document.getElementById('viewer-view');
const searchInput = document.getElementById('search-input');
const resourceList = document.getElementById('resource-list');
const pdfContainer = document.getElementById('pdf-container');
const viewerTitle = document.getElementById('viewer-title');
const backBtn = document.getElementById('back-btn');
const downloadBtn = document.getElementById('download-btn');
const filterChips = document.querySelectorAll('.filter-chip');

// ==========================================
// 2. INITIALIZATION
// ==========================================
async function init() {
    const splash = document.getElementById('splash-screen');

    try {
        console.log("Fetching resources...");
        const response = await fetch('resources.json');
        
        // Optional: Artificial delay to show off splash screen (800ms)
        await new Promise(r => setTimeout(r, 800));

        if (!response.ok) throw new Error("Failed to load database");
        
        allResources = await response.json();
        
        // Sort by date (newest first)
        allResources.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));

        renderList(allResources);
    } catch (error) {
        console.error(error);
        resourceList.innerHTML = `
            <div style="text-align: center; margin-top: 2rem; color: #ef4444;">
                <p>Error loading library.</p>
                <small>${error.message}</small>
            </div>
        `;
    } finally {
        // HIDE SPLASH SCREEN
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 600);
        }
    }
}

// ==========================================
// 3. RENDER THE LIST (TV-Enabled)
// ==========================================
function renderList(items) {
    resourceList.innerHTML = ''; 

    if (items.length === 0) {
        resourceList.innerHTML = `
            <p style="text-align: center; color: #64748b; margin-top: 2rem;">
                No resources found.
            </p>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // TV NAVIGATION ATTRIBUTES
        // tabindex="0" makes a div focusable (selectable by remote/keyboard)
        card.setAttribute('tabindex', '0'); 
        card.setAttribute('role', 'button');

        // Determine Icon based on Type
        let icon = '📄'; // Default
        if (item.type === 'video') icon = '🎬';
        if (item.type === 'audio') icon = '🎧'; // NEW: Audio Icon
        if (item.type === 'image') icon = '🖼️';
        if (item.type === 'document') icon = '💾';

        card.innerHTML = `
            <div class="card-icon">${icon}</div>
            <div class="card-info">
                <h3>${item.title}</h3>
                <p>${item.category} • ${item.size}</p>
            </div>
        `;

        // 1. Mouse Click Event
        card.addEventListener('click', () => openViewer(item));
        
        // 2. TV Remote "Enter" Key Event
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent scrolling
                openViewer(item);
            }
        });

        resourceList.appendChild(card);
    });
}

// ==========================================
// 4. SEARCH & FILTER LOGIC
// ==========================================
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const activeCategory = document.querySelector('.filter-chip.active').getAttribute('data-filter');
    runFilter(query, activeCategory);
});

filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelector('.filter-chip.active').classList.remove('active');
        chip.classList.add('active');
        const category = chip.getAttribute('data-filter');
        const query = searchInput.value.toLowerCase();
        runFilter(query, category);
    });
});

function runFilter(query, category) {
    const filtered = allResources.filter(item => {
        const matchesText = item.title.toLowerCase().includes(query) || 
                          item.category.toLowerCase().includes(query);
        const matchesCategory = category === 'all' || 
                              item.category.toLowerCase().includes(category.toLowerCase());
        return matchesText && matchesCategory;
    });
    renderList(filtered);
}

// ==========================================
// 5. VIEWER LOGIC (The Projector)
// ==========================================
async function openViewer(item) {
    viewerTitle.textContent = item.title;
    downloadBtn.onclick = () => window.open(item.path, '_blank'); 
    
    // Switch Views
    libraryView.classList.remove('active');
    libraryView.classList.add('hidden');
    viewerView.classList.remove('hidden');
    viewerView.classList.add('active');

    // PWA History Magic
    history.pushState({ view: 'viewer' }, null, '#viewer');

    pdfContainer.innerHTML = ''; // Clear previous content

    // RENDER CONTENT BASED ON TYPE
    if (item.type === 'pdf') {
        renderPDF(item.path);
    } 
    else if (item.type === 'video') {
        renderVideo(item);
    } 
    else if (item.type === 'audio') {
        renderAudio(item); // NEW: Calls the audio player
    }
    else if (item.type === 'image') {
        renderImage(item);
    }
    else {
        renderFallback(item);
    }
}

// --- RENDERER: PDF ---
async function renderPDF(url) {
    try {
        pdfContainer.innerHTML = '<div style="color:white; padding:20px;">Loading PDF...</div>';
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        pdfContainer.innerHTML = ''; 

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            pdfContainer.appendChild(canvas);
        }
    } catch (err) {
        console.error(err);
        pdfContainer.innerHTML = `<div style="color:#ef4444; padding:20px;">Error rendering PDF: ${err.message}</div>`;
    }
}

// --- RENDERER: VIDEO ---
function renderVideo(item) {
    const video = document.createElement('video');
    video.src = item.path;
    video.controls = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.maxWidth = '800px';
    video.style.borderRadius = '8px';
    video.style.marginTop = '1rem';
    
    // Auto-focus the video so the remote 'Play' button works immediately
    setTimeout(() => video.focus(), 500);
    
    pdfContainer.appendChild(video);
}

// --- RENDERER: AUDIO (NEW) ---
function renderAudio(item) {
    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center';
    wrapper.style.padding = '2rem';
    wrapper.style.color = 'white';
    wrapper.style.marginTop = '2rem';

    // Big Animated Icon
    const icon = document.createElement('div');
    icon.textContent = '🎧';
    icon.style.fontSize = '6rem';
    icon.style.marginBottom = '2rem';
    icon.style.animation = 'pulse 2s infinite'; 

    // Audio Element
    const audio = document.createElement('audio');
    audio.src = item.path;
    audio.controls = true;
    audio.style.width = '100%';
    audio.style.maxWidth = '500px';
    
    // Auto-focus for remote control
    setTimeout(() => audio.focus(), 500);

    wrapper.appendChild(icon);
    wrapper.appendChild(document.createElement('br'));
    wrapper.appendChild(audio);
    
    pdfContainer.appendChild(wrapper);
}

// --- RENDERER: IMAGE ---
function renderImage(item) {
    const img = document.createElement('img');
    img.src = item.path;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '4px';
    pdfContainer.appendChild(img);
}

// --- RENDERER: FALLBACK ---
function renderFallback(item) {
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.style.color = 'white';
    container.style.padding = '2rem';
    container.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 1rem;">💾</div>
        <h3>This file cannot be previewed.</h3>
        <p style="color: #ccc; margin-bottom: 2rem;">It is a <b>${item.type.toUpperCase()}</b> file.</p>
        <button id="fallback-dl-btn" style="padding: 0.8rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
            Download File
        </button>
    `;
    pdfContainer.appendChild(container);
    document.getElementById('fallback-dl-btn').addEventListener('click', () => {
        window.open(item.path, '_blank');
    });
}

// ==========================================
// 6. NAVIGATION & CLEANUP
// ==========================================
function closeViewer() {
    viewerView.classList.remove('active');
    viewerView.classList.add('hidden');
    libraryView.classList.remove('hidden');
    libraryView.classList.add('active');
    
    // Stop any playing media (Video or Audio)
    const media = pdfContainer.querySelector('video, audio');
    if (media) media.pause();

    setTimeout(() => { pdfContainer.innerHTML = ''; }, 300);
}

window.addEventListener('popstate', closeViewer);
backBtn.addEventListener('click', () => history.back());

init();