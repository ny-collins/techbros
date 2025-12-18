// public/app.js

// ==========================================
// 1. STATE & DOM ELEMENTS
// ==========================================
let allResources = [];
let userSettings = {
    theme: 'system', // system, light, dark
    layout: 'hybrid' // list, grid, hybrid
};

const libraryView = document.getElementById('library-view');
const viewerView = document.getElementById('viewer-view');
const searchInput = document.getElementById('search-input');
const resourceList = document.getElementById('resource-list');
const pdfContainer = document.getElementById('pdf-container');
const viewerTitle = document.getElementById('viewer-title');
const backBtn = document.getElementById('back-btn');
const downloadBtn = document.getElementById('download-btn');
const filterChips = document.querySelectorAll('.filter-chip');

// Settings Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const themeBtns = document.querySelectorAll('[data-theme]');
const layoutBtns = document.querySelectorAll('[data-layout]');

// ==========================================
// 2. INITIALIZATION
// ==========================================
async function init() {
    // A. Load User Preferences
    loadSettings();

    // B. Handle Splash & Data
    const splash = document.getElementById('splash-screen');
    try {
        console.log("Fetching resources...");
        const response = await fetch('resources.json');
        
        await new Promise(r => setTimeout(r, 800)); // Aesthetic delay

        if (!response.ok) throw new Error("Failed to load database");
        
        allResources = await response.json();
        allResources.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));

        renderList(allResources);
    } catch (error) {
        console.error(error);
        resourceList.innerHTML = `<div style="text-align: center; color: #ef4444; margin-top:2rem;">Error: ${error.message}</div>`;
    } finally {
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 600);
        }
    }
}

// ==========================================
// 3. SETTINGS & THEME LOGIC
// ==========================================
function loadSettings() {
    const saved = localStorage.getItem('techbros-settings');
    if (saved) {
        userSettings = JSON.parse(saved);
    }
    applyTheme(userSettings.theme);
    applyLayout(userSettings.layout);
    updateSettingsUI();
}

function saveSettings() {
    localStorage.setItem('techbros-settings', JSON.stringify(userSettings));
}

// Theme Engine
function applyTheme(theme) {
    // 1. Update UI Buttons
    themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    // 2. Apply Classes
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (theme === 'light') {
        document.body.classList.remove('dark-mode');
    } else {
        // System Default Logic
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    }
}

// Layout Engine
function applyLayout(layout) {
    // 1. Update Buttons
    layoutBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    // 2. Update Grid Class
    resourceList.className = 'resource-grid'; // Reset
    resourceList.classList.add(`view-${layout}`);
}

function updateSettingsUI() {
    themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === userSettings.theme));
    layoutBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.layout === userSettings.layout));
}

// Settings Event Listeners
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

// Theme Switching
themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        userSettings.theme = btn.dataset.theme;
        applyTheme(userSettings.theme);
        saveSettings();
    });
});

// Layout Switching
layoutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        userSettings.layout = btn.dataset.layout;
        applyLayout(userSettings.layout);
        saveSettings();
    });
});

// ==========================================
// 4. RENDER LIST (With Phosphor Icons)
// ==========================================
function renderList(items) {
    resourceList.innerHTML = ''; 

    if (items.length === 0) {
        resourceList.innerHTML = `<p style="text-align: center; color: var(--text-light); margin-top: 2rem;">No resources found.</p>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('tabindex', '0'); 
        card.setAttribute('role', 'button');

        // PHOSPHOR ICON MAPPING
        let iconClass = 'ph-file-text'; // Default
        let colorClass = 'icon-default';

        if (item.type === 'pdf') { iconClass = 'ph-file-pdf'; colorClass = 'icon-red'; }
        if (item.type === 'video') { iconClass = 'ph-film-strip'; colorClass = 'icon-blue'; }
        if (item.type === 'audio') { iconClass = 'ph-headphones'; colorClass = 'icon-purple'; }
        if (item.type === 'image') { iconClass = 'ph-image'; colorClass = 'icon-green'; }
        if (item.type === 'document') { iconClass = 'ph-file-doc'; colorClass = 'icon-blue'; }

        // We use 'ph-duotone' for a stylish two-tone look
        const iconHtml = `<i class="ph-duotone ${iconClass} ${colorClass}"></i>`;

        card.innerHTML = `
            <div class="card-icon">${iconHtml}</div>
            <div class="card-info">
                <h3>${item.title}</h3>
                <p>${item.category} • ${item.size}</p>
            </div>
        `;

        card.addEventListener('click', () => openViewer(item));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openViewer(item);
            }
        });
        
        resourceList.appendChild(card);
    });
}

// ==========================================
// 5. SEARCH & FILTER LOGIC
// ==========================================
searchInput.addEventListener('input', (e) => {
    runFilter(e.target.value.toLowerCase(), getActiveCategory());
});

filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelector('.filter-chip.active').classList.remove('active');
        chip.classList.add('active');
        runFilter(searchInput.value.toLowerCase(), chip.getAttribute('data-filter'));
    });
});

function getActiveCategory() {
    return document.querySelector('.filter-chip.active').getAttribute('data-filter');
}

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
// 6. VIEWER LOGIC (Audio + TV Ready)
// ==========================================
async function openViewer(item) {
    viewerTitle.textContent = item.title;
    downloadBtn.onclick = () => window.open(item.path, '_blank'); 
    
    libraryView.classList.remove('active');
    libraryView.classList.add('hidden');
    viewerView.classList.remove('hidden');
    viewerView.classList.add('active');

    history.pushState({ view: 'viewer' }, null, '#viewer');

    pdfContainer.innerHTML = ''; 

    if (item.type === 'pdf') renderPDF(item.path);
    else if (item.type === 'video') renderVideo(item);
    else if (item.type === 'audio') renderAudio(item);
    else if (item.type === 'image') renderImage(item);
    else renderFallback(item);
}

// --- RENDERERS ---
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
        pdfContainer.innerHTML = `<div style="color:#ef4444; padding:20px;">Error: ${err.message}</div>`;
    }
}

function renderVideo(item) {
    const video = document.createElement('video');
    video.src = item.path;
    video.controls = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.maxWidth = '800px';
    video.style.marginTop = '1rem';
    setTimeout(() => video.focus(), 500); 
    pdfContainer.appendChild(video);
}

function renderAudio(item) {
    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center';
    wrapper.style.padding = '2rem';
    wrapper.style.color = 'white';
    wrapper.style.marginTop = '2rem';

    // Animated Music Icon
    const icon = document.createElement('i');
    icon.className = 'ph-duotone ph-music-notes';
    icon.style.fontSize = '6rem';
    icon.style.marginBottom = '2rem';
    icon.style.color = '#a855f7'; // Purple
    icon.style.animation = 'pulse 2s infinite'; 

    const audio = document.createElement('audio');
    audio.src = item.path;
    audio.controls = true;
    audio.style.width = '100%';
    audio.style.maxWidth = '500px';
    setTimeout(() => audio.focus(), 500);

    wrapper.appendChild(icon);
    wrapper.appendChild(document.createElement('br'));
    wrapper.appendChild(audio);
    pdfContainer.appendChild(wrapper);
}

function renderImage(item) {
    const img = document.createElement('img');
    img.src = item.path;
    img.style.maxWidth = '100%';
    pdfContainer.appendChild(img);
}

function renderFallback(item) {
    const div = document.createElement('div');
    div.innerHTML = `
        <div style="text-align:center; color:white; padding:2rem;">
            <i class="ph-duotone ph-warning-circle" style="font-size:4rem; margin-bottom:1rem; color:#fbbf24;"></i>
            <h3>File cannot be previewed.</h3>
            <button id="dl-btn" style="padding:10px 20px; margin-top:10px; cursor:pointer; background:var(--primary); color:white; border:none; border-radius:6px; display:inline-flex; align-items:center; gap:8px;">
                Download File <i class="ph-bold ph-download-simple"></i>
            </button>
        </div>`;
    pdfContainer.appendChild(div);
    document.getElementById('dl-btn').onclick = () => window.open(item.path, '_blank');
}

// ==========================================
// 7. NAVIGATION
// ==========================================
function closeViewer() {
    viewerView.classList.remove('active');
    viewerView.classList.add('hidden');
    libraryView.classList.remove('hidden');
    libraryView.classList.add('active');
    
    const media = pdfContainer.querySelector('video, audio');
    if (media) media.pause();

    setTimeout(() => { pdfContainer.innerHTML = ''; }, 300);
}

window.addEventListener('popstate', closeViewer);
backBtn.addEventListener('click', () => history.back());

init();