// public/app.js

// ==========================================
// 1. STATE & DOM ELEMENTS
// ==========================================
let allResources = [];
let userSettings = { theme: 'system', layout: 'hybrid' };
let peer = null; // WebRTC Peer Instance

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

// Share/P2P Elements
const receiveBtn = document.getElementById('receive-btn');
const shareModal = document.getElementById('share-modal');
const closeShareBtn = document.getElementById('close-share');
const shareBody = document.getElementById('share-body');
const shareTitle = document.getElementById('share-title');

// ==========================================
// 2. INITIALIZATION
// ==========================================
async function init() {
    loadSettings();
    const splash = document.getElementById('splash-screen');
    try {
        const response = await fetch('resources.json');
        await new Promise(r => setTimeout(r, 800));
        if (!response.ok) throw new Error("Failed to load database");
        allResources = await response.json();
        allResources.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
        renderList(allResources);
    } catch (error) {
        console.error(error);
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
    if (saved) userSettings = JSON.parse(saved);
    applyTheme(userSettings.theme);
    applyLayout(userSettings.layout);
    updateSettingsUI();
}

function saveSettings() {
    localStorage.setItem('techbros-settings', JSON.stringify(userSettings));
}

function applyTheme(theme) {
    themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
    if (theme === 'dark') document.body.classList.add('dark-mode');
    else if (theme === 'light') document.body.classList.remove('dark-mode');
    else {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    }
}

function applyLayout(layout) {
    layoutBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.layout === layout));
    resourceList.className = 'resource-grid';
    resourceList.classList.add(`view-${layout}`);
}

function updateSettingsUI() {
    themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === userSettings.theme));
    layoutBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.layout === userSettings.layout));
}

settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

themeBtns.forEach(btn => btn.addEventListener('click', () => {
    userSettings.theme = btn.dataset.theme;
    applyTheme(userSettings.theme);
    saveSettings();
}));

layoutBtns.forEach(btn => btn.addEventListener('click', () => {
    userSettings.layout = btn.dataset.layout;
    applyLayout(userSettings.layout);
    saveSettings();
}));

// ==========================================
// 4. P2P SHARING LOGIC (WebRTC)
// ==========================================

// --- SENDER LOGIC ---
function startHosting(item) {
    // 1. Generate a 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000);
    const peerId = `techbros-${pin}`;

    // 2. Open Modal
    shareTitle.textContent = "Share File";
    shareBody.innerHTML = `
        <div style="text-align:center;">
            <p>Tell the receiver to enter this PIN:</p>
            <div class="pin-display">${pin}</div>
            <p style="font-size:0.8rem; color:var(--text-light); margin-top:1rem;">
                <i class="ph ph-spinner ph-spin"></i> Waiting for connection...
            </p>
        </div>
    `;
    shareModal.classList.remove('hidden');

    // 3. Initialize Peer (Host)
    if (peer) peer.destroy();
    peer = new Peer(peerId);

    peer.on('connection', (conn) => {
        // Connected!
        shareBody.innerHTML = `
            <div style="text-align:center; color: var(--primary);">
                <i class="ph-duotone ph-check-circle" style="font-size:3rem;"></i>
                <p>Connected!</p>
                <p>Sending <b>${item.title}</b>...</p>
            </div>
        `;

        // 4. Fetch the file blob and send
        fetch(item.path)
            .then(res => res.blob())
            .then(blob => {
                conn.send({
                    file: blob,
                    filename: item.filename,
                    type: item.type
                });
                // Success Message
                setTimeout(() => {
                    shareBody.innerHTML = `<p style="text-align:center;">Sent Successfully! 🎉</p>`;
                }, 1000);
            })
            .catch(err => {
                shareBody.innerHTML = `<p style="color:red">Error reading file: ${err.message}</p>`;
            });
    });

    peer.on('error', (err) => {
        console.error(err);
        shareBody.innerHTML = `<p style="color:red">Connection Error. Try again.</p>`;
    });
}

// --- RECEIVER LOGIC ---
function startReceiving() {
    shareTitle.textContent = "Receive File";
    shareBody.innerHTML = `
        <div style="text-align:center;">
            <p>Enter the Sender's PIN:</p>
            <input type="number" id="pin-input" placeholder="0000" class="pin-input">
            <button id="connect-btn" class="primary-btn" style="margin-top:1rem; width:100%;">
                Connect & Download
            </button>
        </div>
    `;
    shareModal.classList.remove('hidden');

    // Focus input
    setTimeout(() => document.getElementById('pin-input').focus(), 100);

    document.getElementById('connect-btn').onclick = () => {
        const pin = document.getElementById('pin-input').value;
        if (pin.length < 4) return alert("Invalid PIN");

        shareBody.innerHTML = `
            <div style="text-align:center;">
                <i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i>
                <p>Connecting to ${pin}...</p>
            </div>
        `;

        // 1. Create Peer (Guest)
        if (peer) peer.destroy();
        peer = new Peer(); // Random ID for us

        peer.on('open', () => {
            const conn = peer.connect(`techbros-${pin}`);

            conn.on('open', () => {
                shareBody.innerHTML = `<p style="text-align:center;">Connected! Waiting for file...</p>`;
            });

            conn.on('data', (data) => {
                // 2. File Received!
                shareBody.innerHTML = `
                    <div style="text-align:center;">
                        <i class="ph-duotone ph-download-simple" style="font-size:3rem; color:var(--primary);"></i>
                        <p>Received <b>${data.filename}</b></p>
                    </div>
                `;
                
                // 3. Trigger Download
                const url = URL.createObjectURL(data.file);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.filename;
                a.click();
            });

            // If sender disconnects/error
            peer.on('error', (err) => {
                shareBody.innerHTML = `<p style="color:red">Peer not found. Check PIN.</p>`;
            });
        });
    };
}

receiveBtn.addEventListener('click', startReceiving);
closeShareBtn.addEventListener('click', () => {
    shareModal.classList.add('hidden');
    if (peer) peer.destroy(); // Clean up
});


// ==========================================
// 5. RENDER LIST (Updated with Share Button)
// ==========================================
function renderList(items) {
    resourceList.innerHTML = ''; 
    if (items.length === 0) {
        resourceList.innerHTML = `<p style="text-align: center; color: var(--text-light);">No resources.</p>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('tabindex', '0'); 

        let iconClass = 'ph-file-text'; 
        let colorClass = 'icon-default';
        if (item.type === 'pdf') { iconClass = 'ph-file-pdf'; colorClass = 'icon-red'; }
        if (item.type === 'video') { iconClass = 'ph-film-strip'; colorClass = 'icon-blue'; }
        if (item.type === 'audio') { iconClass = 'ph-headphones'; colorClass = 'icon-purple'; }
        if (item.type === 'image') { iconClass = 'ph-image'; colorClass = 'icon-green'; }

        card.innerHTML = `
            <div class="card-icon"><i class="ph-duotone ${iconClass} ${colorClass}"></i></div>
            <div class="card-info">
                <h3>${item.title}</h3>
                <p>${item.category} • ${item.size}</p>
            </div>
            <button class="action-btn share-btn" aria-label="Share">
                <i class="ph-bold ph-share-network"></i>
            </button>
        `;

        // Open Viewer (Click Card)
        card.addEventListener('click', (e) => {
            // Don't trigger if clicked on the share button
            if (e.target.closest('.share-btn')) return;
            openViewer(item);
        });

        // Share Action
        const shareBtn = card.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop card click
            startHosting(item);
        });
        
        // TV Navigation
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') openViewer(item);
        });
        
        resourceList.appendChild(card);
    });
}

// ==========================================
// 6. SEARCH & FILTER
// ==========================================
searchInput.addEventListener('input', (e) => runFilter(e.target.value.toLowerCase(), getActiveCategory()));
filterChips.forEach(chip => chip.addEventListener('click', () => {
    document.querySelector('.filter-chip.active').classList.remove('active');
    chip.classList.add('active');
    runFilter(searchInput.value.toLowerCase(), chip.getAttribute('data-filter'));
}));

function getActiveCategory() { return document.querySelector('.filter-chip.active').getAttribute('data-filter'); }

function runFilter(query, category) {
    const filtered = allResources.filter(item => {
        const matchesText = item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
        const matchesCategory = category === 'all' || item.category.toLowerCase().includes(category.toLowerCase());
        return matchesText && matchesCategory;
    });
    renderList(filtered);
}

// ==========================================
// 7. VIEWER LOGIC
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
    } catch (err) { pdfContainer.innerHTML = `<div style="color:#ef4444;">Error: ${err.message}</div>`; }
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
    const icon = document.createElement('i');
    icon.className = 'ph-duotone ph-music-notes';
    icon.style.fontSize = '6rem';
    icon.style.marginBottom = '2rem';
    icon.style.color = '#a855f7'; 
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
            <i class="ph-duotone ph-warning-circle" style="font-size:4rem; color:#fbbf24;"></i>
            <h3>File cannot be previewed.</h3>
            <button id="dl-btn" class="primary-btn">Download</button>
        </div>`;
    pdfContainer.appendChild(div);
    document.getElementById('dl-btn').onclick = () => window.open(item.path, '_blank');
}

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