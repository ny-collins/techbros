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

// P2P Elements
const receiveBtn = document.getElementById('receive-btn');
const sendLocalBtn = document.getElementById('send-local-btn');
const localFileInput = document.getElementById('local-file-input');
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

function applyTheme(theme) {
    themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (theme === 'light') {
        document.body.classList.remove('dark-mode');
    } else {
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
// 4. P2P SHARING LOGIC (The "AirShare" Engine)
// ==========================================

// --- A. HOSTING (SENDING) ---

// Option 1: Send a Library File (From Database)
function startHostingLibraryFile(item) {
    // Fetch file as Blob first
    fetch(item.path)
        .then(res => res.blob())
        .then(blob => {
            initiateP2P(blob, item.title, item.type);
        })
        .catch(err => {
            alert("Error: Could not load file for sharing.");
            console.error(err);
        });
}

// Option 2: Send a Local File (From Device Storage)
sendLocalBtn.addEventListener('click', () => {
    localFileInput.click(); // Trigger hidden input
});

localFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input value to allow selecting the same file again
    localFileInput.value = '';

    // Initiate P2P with the File object
    initiateP2P(file, file.name, 'local');
});

// The Core Hosting Logic
function initiateP2P(fileBlob, filename, fileType) {
    // 1. Generate PIN
    const pin = Math.floor(1000 + Math.random() * 9000);
    const peerId = `techbros-${pin}`;

    // 2. Show Modal
    shareTitle.textContent = "Send File";
    shareBody.innerHTML = `
        <div style="text-align:center;">
            <p>Sending: <b>${filename}</b></p>
            <div class="pin-display">${pin}</div>
            <p style="font-size:0.8rem; color:var(--text-light); margin-top:1rem;">
                <i class="ph ph-spinner ph-spin"></i> Waiting for receiver...
            </p>
        </div>
    `;
    shareModal.classList.remove('hidden');

    // 3. Start Peer
    if (peer) peer.destroy();
    peer = new Peer(peerId);

    peer.on('connection', (conn) => {
        // Connected!
        shareBody.innerHTML = `
            <div style="text-align:center; color: var(--primary);">
                <i class="ph-duotone ph-check-circle" style="font-size:3rem;"></i>
                <p>Connected!</p>
                <p>Transferring...</p>
            </div>
        `;

        conn.on('open', () => {
             conn.send({
                file: fileBlob,
                filename: filename,
                type: fileType
            });
            
            setTimeout(() => {
                shareBody.innerHTML = `<p style="text-align:center;">Sent Successfully! 🎉</p>`;
            }, 1000);
        });
    });

    peer.on('error', (err) => {
        console.error(err);
        shareBody.innerHTML = `<p style="color:red">Connection Error. Restart app.</p>`;
    });
}

// --- B. RECEIVING (MANUAL SAVE FIX) ---
function startReceiving() {
    shareTitle.textContent = "Receive File";
    shareBody.innerHTML = `
        <div style="text-align:center;">
            <p>Enter Sender's PIN:</p>
            <input type="number" id="pin-input" placeholder="0000" class="pin-input">
            <button id="connect-btn" class="primary-btn" style="margin-top:1rem; width:100%;">
                Connect & Download
            </button>
        </div>
    `;
    shareModal.classList.remove('hidden');
    setTimeout(() => document.getElementById('pin-input').focus(), 100);

    document.getElementById('connect-btn').onclick = () => {
        const pin = document.getElementById('pin-input').value;
        if (pin.length < 4) return;

        shareBody.innerHTML = `
            <div style="text-align:center;">
                <i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i>
                <p>Connecting to ${pin}...</p>
            </div>
        `;

        if (peer) peer.destroy();
        peer = new Peer(); // Random Guest ID

        peer.on('open', () => {
            const conn = peer.connect(`techbros-${pin}`);

            conn.on('open', () => {
                shareBody.innerHTML = `<p style="text-align:center;">Connected! Waiting for data...</p>`;
            });

            conn.on('data', (data) => {
                // 1. DATA RECEIVED
                // Ensure data is treated as a Blob
                let receivedBlob = data.file;
                if (receivedBlob instanceof ArrayBuffer) {
                    receivedBlob = new Blob([receivedBlob]);
                } else if (! (receivedBlob instanceof Blob)) {
                    receivedBlob = new Blob([new Uint8Array(data.file)]); 
                }

                // 2. Create Object URL
                const url = URL.createObjectURL(receivedBlob);

                // 3. SHOW MANUAL SAVE BUTTON
                // (Bypasses browser auto-download blocking)
                shareBody.innerHTML = `
                    <div style="text-align:center;">
                        <i class="ph-duotone ph-file-arrow-down" style="font-size:4rem; color:var(--primary); margin-bottom:1rem;"></i>
                        <p>Received <b>${data.filename}</b></p>
                        
                        <button id="manual-save-btn" class="primary-btn" style="margin-top:1rem; width:100%; background-color:#22c55e;">
                            <i class="ph-bold ph-download-simple"></i> Save to Device
                        </button>
                    </div>
                `;
                
                // 4. TRIGGER DOWNLOAD ON CLICK
                document.getElementById('manual-save-btn').onclick = () => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = data.filename;
                    document.body.appendChild(a); // Required for Firefox
                    a.click();
                    document.body.removeChild(a); // Cleanup
                };
            });

            peer.on('error', (err) => {
                shareBody.innerHTML = `<p style="color:red">Peer not found. Check PIN.</p>`;
            });
        });
    };
}

receiveBtn.addEventListener('click', startReceiving);
closeShareBtn.addEventListener('click', () => {
    shareModal.classList.add('hidden');
    if (peer) peer.destroy(); // Cleanup
});

// ==========================================
// 5. RENDER LIST
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

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.share-btn')) openViewer(item);
        });

        const shareBtn = card.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            startHostingLibraryFile(item);
        });
        
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
    libraryView.classList.remove('active'); libraryView.classList.add('hidden');
    viewerView.classList.remove('hidden'); viewerView.classList.add('active');
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

function renderVideo(path) {
    const v = document.createElement('video'); v.src = path; v.controls = true; v.style.maxWidth = '100%'; v.style.marginTop = '1rem';
    setTimeout(() => v.focus(), 500); 
    pdfContainer.appendChild(v);
}

function renderAudio(path) {
    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center'; wrapper.style.padding = '2rem'; wrapper.style.color = 'white'; wrapper.style.marginTop = '2rem';
    const icon = document.createElement('i'); icon.className = 'ph-duotone ph-music-notes'; icon.style.fontSize = '6rem'; icon.style.marginBottom = '2rem'; icon.style.color = '#a855f7'; icon.style.animation = 'pulse 2s infinite'; 
    const audio = document.createElement('audio'); audio.src = path; audio.controls = true; audio.style.width = '100%'; audio.style.maxWidth = '500px';
    setTimeout(() => audio.focus(), 500);
    wrapper.appendChild(icon); wrapper.appendChild(document.createElement('br')); wrapper.appendChild(audio);
    pdfContainer.appendChild(wrapper);
}

function renderImage(path) {
    const i = document.createElement('img'); i.src = path; i.style.maxWidth='100%';
    pdfContainer.appendChild(i);
}

function renderFallback(item) {
    const div = document.createElement('div');
    div.innerHTML = `<div style="text-align:center; color:white; padding:2rem;"><i class="ph-duotone ph-warning-circle" style="font-size:4rem; color:#fbbf24;"></i><h3>File cannot be previewed.</h3><button id="dl-btn" class="primary-btn">Download</button></div>`;
    pdfContainer.appendChild(div);
    document.getElementById('dl-btn').onclick = () => window.open(item.path, '_blank');
}

function closeViewer() {
    viewerView.classList.remove('active'); viewerView.classList.add('hidden');
    libraryView.classList.remove('hidden'); libraryView.classList.add('active');
    const m = pdfContainer.querySelector('video, audio'); if (m) m.pause();
    setTimeout(() => { pdfContainer.innerHTML = ''; }, 300);
}

window.addEventListener('popstate', closeViewer);
backBtn.addEventListener('click', () => history.back());

init();