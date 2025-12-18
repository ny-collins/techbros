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
        // Fetch the JSON database
        const response = await fetch('resources.json');
        
        // Optional: Artificial delay to show off splash screen (800ms)
        // You can remove this line for maximum speed
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
        // This runs whether the fetch succeeds OR fails
        if (splash) {
            splash.classList.add('fade-out');
            
            // Remove it from DOM entirely after animation finishes
            setTimeout(() => splash.remove(), 600);
        }
    }
}

// ==========================================
// 3. RENDER THE LIST (The Librarian)
// ==========================================
function renderList(items) {
    resourceList.innerHTML = ''; // Clear current list

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
        
        // Determine Icon based on Type
        let icon = '📄'; // Default
        if (item.type === 'video') icon = '🎬';
        if (item.type === 'image') icon = '🖼️';
        if (item.type === 'document') icon = '💾';

        card.innerHTML = `
            <div class="card-icon">${icon}</div>
            <div class="card-info">
                <h3>${item.title}</h3>
                <p>${item.category} • ${item.size}</p>
            </div>
        `;

        // Click Event: Open the Viewer
        card.addEventListener('click', () => openViewer(item));
        
        resourceList.appendChild(card);
    });
}

// ==========================================
// 4. SEARCH & FILTER LOGIC
// ==========================================

// A. Text Search Input
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const activeCategory = document.querySelector('.filter-chip.active').getAttribute('data-filter');
    
    runFilter(query, activeCategory);
});

// B. Category Chips
filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        // Visual Update
        document.querySelector('.filter-chip.active').classList.remove('active');
        chip.classList.add('active');
        
        // Logical Update
        const category = chip.getAttribute('data-filter');
        const query = searchInput.value.toLowerCase();
        
        runFilter(query, category);
    });
});

// C. The Combined Filter Engine
function runFilter(query, category) {
    const filtered = allResources.filter(item => {
        // Check Text Match (Title or Category)
        const matchesText = item.title.toLowerCase().includes(query) || 
                          item.category.toLowerCase().includes(query);
        
        // Check Category Match
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
    // A. Update Top Bar
    viewerTitle.textContent = item.title;
    downloadBtn.onclick = () => window.open(item.path, '_blank'); 
    
    // B. Switch Views (CSS Transitions)
    libraryView.classList.remove('active');
    libraryView.classList.add('hidden');
    viewerView.classList.remove('hidden');
    viewerView.classList.add('active');

    // C. PWA History Magic (Handle Back Button)
    history.pushState({ view: 'viewer' }, null, '#viewer');

    // D. Render Content based on File Type
    pdfContainer.innerHTML = ''; // Clear previous content

    if (item.type === 'pdf') {
        renderPDF(item.path);
    } 
    else if (item.type === 'video') {
        renderVideo(item);
    } 
    else if (item.type === 'image') {
        renderImage(item);
    }
    else {
        renderFallback(item);
    }
}

// --- RENDERER: PDF (Mozilla PDF.js) ---
async function renderPDF(url) {
    try {
        pdfContainer.innerHTML = '<div style="color:white; padding:20px;">Loading PDF...</div>';
        
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        
        pdfContainer.innerHTML = ''; // Clear loading text

        // Loop through all pages and render canvas for each
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            
            // Scale: 1.5 is a good balance for mobile quality
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
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
    video.playsInline = true; // Important for iOS
    video.style.width = '100%';
    video.style.maxWidth = '800px';
    video.style.borderRadius = '8px';
    video.style.marginTop = '1rem';
    
    pdfContainer.appendChild(video);
}

// --- RENDERER: IMAGE ---
function renderImage(item) {
    const img = document.createElement('img');
    img.src = item.path;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '4px';
    
    pdfContainer.appendChild(img);
}

// --- RENDERER: FALLBACK (DOCX, ZIP, etc) ---
function renderFallback(item) {
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.style.color = 'white';
    container.style.padding = '2rem';
    
    container.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 1rem;">💾</div>
        <h3>This file cannot be previewed.</h3>
        <p style="color: #ccc; margin-bottom: 2rem;">It is a <b>${item.type.toUpperCase()}</b> file.</p>
        <button id="fallback-dl-btn" style="
            padding: 0.8rem 1.5rem; 
            background: #2563eb; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            Download File
        </button>
    `;
    
    pdfContainer.appendChild(container);
    
    // Add event listener to the button
    document.getElementById('fallback-dl-btn').addEventListener('click', () => {
        window.open(item.path, '_blank');
    });
}

// ==========================================
// 6. NAVIGATION & CLEANUP
// ==========================================
function closeViewer() {
    // Switch Views
    viewerView.classList.remove('active');
    viewerView.classList.add('hidden');
    libraryView.classList.remove('hidden');
    libraryView.classList.add('active');
    
    // Stop any playing video
    const video = pdfContainer.querySelector('video');
    if (video) video.pause();

    // Clear memory (Wait for transition to finish)
    setTimeout(() => { pdfContainer.innerHTML = ''; }, 300);
}

// Listen for Browser Back Button
window.addEventListener('popstate', () => {
    closeViewer();
});

// Listen for App Back Button
backBtn.addEventListener('click', () => {
    history.back(); // This triggers 'popstate'
});

// START THE APP
init();