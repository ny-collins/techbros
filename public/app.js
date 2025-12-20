// public/app.js - Main Application Logic
// TechBros Library v1.6.0
// Refactored with security fixes, modular design, improved UX, and auto-update system

import { 
    sanitizeHTML, 
    validateFile, 
    fuzzySearch, 
    formatDate, 
    debounce, 
    isOnline, 
    generatePIN,
    CONSTANTS 
} from './utils.js';

// ==========================================
// 1. STATE & DOM ELEMENTS
// ==========================================
let allResources = [];
let currentResource = null;
let userSettings = { theme: 'system', layout: 'hybrid' };
let peer = null;
let currentView = 'library';
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;

// Main Views
const libraryView = document.getElementById('library-view');
const viewerView = document.getElementById('viewer-view');
const shareView = document.getElementById('share-view');
const exportView = document.getElementById('export-view');
const aboutView = document.getElementById('about-view');
const helpView = document.getElementById('help-view');

// Library Elements
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const resourceList = document.getElementById('resource-list');
// filterChips now generated dynamically

// Viewer Elements
const pdfContainer = document.getElementById('pdf-container');
const viewerTitle = document.getElementById('viewer-title');
const backBtn = document.getElementById('back-btn');
const downloadBtn = document.getElementById('download-btn');

// Sidebar Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle = document.getElementById('menu-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const navItems = document.querySelectorAll('.nav-item');

// Header Elements
const onlineStatus = document.getElementById('online-status');

// Settings Elements (now in view)
const themeBtns = document.querySelectorAll('[data-theme]');
const layoutBtns = document.querySelectorAll('[data-layout]');
const cacheHeaderBtn = document.getElementById('cache-clear-btn');

// P2P Elements
const sendLocalFileBtn = document.getElementById('send-local-file-btn');
const receiveFileBtn = document.getElementById('receive-file-btn');
const localFileInput = document.getElementById('local-file-input');
const shareModal = document.getElementById('share-modal');
const closeShareBtn = document.getElementById('close-share');
const shareBody = document.getElementById('share-body');
const shareTitle = document.getElementById('share-title');

// Export Elements
const exportSettingsBtn = document.getElementById('export-settings-btn');
const exportResourcesBtn = document.getElementById('export-resources-btn');
const storageInfo = document.getElementById('storage-info');

// ==========================================
// 2. INITIALIZATION
// ==========================================
async function init() {
    loadSettings();
    setupEventListeners();
    updateOnlineStatus();
    await loadDynamicContent(); // Load version, categories, stats
    
    const splash = document.getElementById('splash-screen');
    
    try {
        console.log("Fetching resources...");
        const response = await fetch('/resources.json');
        
        await new Promise(r => setTimeout(r, CONSTANTS.SPLASH_DELAY));

        if (!response.ok) throw new Error("Failed to load database");
        
        allResources = await response.json();
        allResources.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));

        generateCategoryFilters(); // Generate filters from actual categories
        renderList(allResources);
        updateStatistics(); // Update stats after resources loaded
    } catch (error) {
        console.error(error);
        showError(`Error loading resources: ${error.message}`);
    } finally {
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 600);
        }
    }
}

// Load dynamic content (version, year)
async function loadDynamicContent() {
    try {
        // Load version from manifest.json
        const manifest = await fetch('/manifest.json').then(r => r.json());
        const version = manifest.version || '1.5.9';
        
        // Update version displays
        const appVersionEl = document.getElementById('app-version');
        const aboutVersionEl = document.getElementById('about-version');
        if (appVersionEl) appVersionEl.textContent = version;
        if (aboutVersionEl) aboutVersionEl.textContent = version;
        
        // Update year dynamically
        const yearEl = document.getElementById('about-year');
        const currentDate = new Date();
        const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (yearEl) yearEl.textContent = monthYear;
    } catch (error) {
        console.error('Failed to load dynamic content:', error);
        // Fallback to default values
        const appVersionEl = document.getElementById('app-version');
        const aboutVersionEl = document.getElementById('about-version');
        if (appVersionEl) appVersionEl.textContent = '1.5.9';
        if (aboutVersionEl) aboutVersionEl.textContent = '1.5.9';
    }
}

// Generate category filters from resources
function generateCategoryFilters() {
    const filterContainer = document.getElementById('filter-container');
    if (!filterContainer) return;
    
    // Extract unique categories from resources
    const categories = ['all', ...new Set(allResources.map(r => r.category).filter(Boolean))];
    
    // Clear existing filters
    filterContainer.innerHTML = '';
    
    // Create filter chips
    categories.forEach((category, index) => {
        const chip = document.createElement('button');
        chip.className = 'filter-chip' + (index === 0 ? ' active' : '');
        chip.dataset.filter = category;
        chip.textContent = category === 'all' ? 'All' : category;
        
        chip.addEventListener('click', handleFilterChange);
        filterContainer.appendChild(chip);
    });
}

// Update statistics
function updateStatistics() {
    const statsEl = document.getElementById('app-stats');
    if (!statsEl) return;
    
    const totalResources = allResources.length;
    const categories = new Set(allResources.map(r => r.category).filter(Boolean));
    const categoriesCount = categories.size;
    
    // Calculate total size (if available)
    let totalSize = 0;
    allResources.forEach(resource => {
        if (resource.size) {
            // Parse size string (e.g., "2.5 MB" -> bytes)
            const sizeMatch = resource.size.match(/([0-9.]+)\s*(KB|MB|GB)/i);
            if (sizeMatch) {
                const value = parseFloat(sizeMatch[1]);
                const unit = sizeMatch[2].toUpperCase();
                const multiplier = unit === 'GB' ? 1024*1024*1024 : unit === 'MB' ? 1024*1024 : 1024;
                totalSize += value * multiplier;
            }
        }
    });
    
    // Format total size
    let sizeText = '';
    if (totalSize > 0) {
        const sizeGB = totalSize / (1024*1024*1024);
        const sizeMB = totalSize / (1024*1024);
        sizeText = sizeGB >= 1 ? `${sizeGB.toFixed(2)} GB` : `${sizeMB.toFixed(2)} MB`;
    }
    
    statsEl.innerHTML = `
        <strong>${totalResources}</strong> resources across <strong>${categoriesCount}</strong> categories
        ${sizeText ? `<br><small style="color: var(--text-light);">Total content size: ${sizeText}</small>` : ''}
    `;
}

// ==========================================
// 3. EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
    // Sidebar
    menuToggle.addEventListener('click', openSidebar);
    sidebarClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            navigateToView(view);
            closeSidebar();
        });
    });
    
    // Search
    searchInput.addEventListener('input', debounce(handleSearch, CONSTANTS.DEBOUNCE_DELAY));
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Filters (will be dynamically added in generateCategoryFilters)
    
    // Viewer
    backBtn.addEventListener('click', () => {
        closeViewer();
        navigateToView('library');
    });
    
    // Theme & Layout (Header Icons)
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const layoutToggleBtn = document.getElementById('layout-toggle-btn');
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', cycleTheme);
    }
    if (layoutToggleBtn) {
        layoutToggleBtn.addEventListener('click', cycleLayout);
    }
    if (cacheHeaderBtn) {
        cacheHeaderBtn.addEventListener('click', clearCache);
    }
    
    // Legacy theme/layout buttons (if any remain in modals/pages)
    themeBtns.forEach(btn => btn.addEventListener('click', () => changeTheme(btn.dataset.theme)));
    layoutBtns.forEach(btn => btn.addEventListener('click', () => changeLayout(btn.dataset.layout)));
    
    // P2P (from Share subpage)
    if (receiveFileBtn) receiveFileBtn.addEventListener('click', startReceiving);
    if (sendLocalFileBtn) sendLocalFileBtn.addEventListener('click', () => localFileInput.click());
    localFileInput.addEventListener('change', handleLocalFileSelect);
    closeShareBtn.addEventListener('click', closeShareModal);
    
    // Export
    exportSettingsBtn.addEventListener('click', exportSettings);
    exportResourcesBtn.addEventListener('click', exportResources);
    
    // Online/Offline
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Navigation
    window.addEventListener('popstate', handlePopState);
}

// ==========================================
// 4. SIDEBAR NAVIGATION
// ==========================================
function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
    document.body.style.overflow = '';
}

function navigateToView(viewName) {
    // Hide all views
    const allViews = [libraryView, viewerView, shareView, exportView, aboutView, helpView];
    allViews.forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });
    
    // Update nav items
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });
    
    // Show selected view
    const viewMap = {
        'library': libraryView,
        'share': shareView,
        'export': exportView,
        'about': aboutView,
        'help': helpView
    };
    
    const targetView = viewMap[viewName];
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
        currentView = viewName;
        
        // Update storage info if on export view
        if (viewName === 'export') {
            updateStorageInfo();
        }
    }
    
    // Update URL
    history.pushState({ view: viewName }, null, `#${viewName}`);
}

function handlePopState(event) {
    if (event.state && event.state.view) {
        navigateToView(event.state.view);
    }
}

// ==========================================
// 5. ONLINE/OFFLINE STATUS
// ==========================================
function updateOnlineStatus() {
    const online = isOnline();
    onlineStatus.className = `status-badge ${online ? 'online' : 'offline'}`;
    onlineStatus.innerHTML = online 
        ? '<i class="ph ph-wifi-high"></i>'
        : '<i class="ph ph-wifi-slash"></i>';
}

// ==========================================
// 6. SETTINGS & THEME LOGIC
// ==========================================
function loadSettings() {
    const saved = localStorage.getItem('techbros-settings');
    if (saved) {
        try {
            userSettings = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse settings:', e);
        }
    }
    applyTheme(userSettings.theme);
    applyLayout(userSettings.layout);
}

function saveSettings() {
    try {
        localStorage.setItem('techbros-settings', JSON.stringify(userSettings));
    } catch (e) {
        console.error('Failed to save settings:', e);
        showNotification('Settings could not be saved', 'error');
    }
}

function changeTheme(theme) {
    userSettings.theme = theme;
    applyTheme(theme);
    saveSettings();
}

function changeLayout(layout) {
    userSettings.layout = layout;
    applyLayout(layout);
    saveSettings();
}

// Cycle through themes for header icon button
function cycleTheme() {
    const themes = ['system', 'light', 'dark'];
    const currentIndex = themes.indexOf(userSettings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    
    changeTheme(nextTheme);
    
    // Update icon
    const icon = document.querySelector('#theme-toggle-btn i');
    if (icon) {
        icon.className = nextTheme === 'dark' ? 'ph ph-moon' : 
                        nextTheme === 'light' ? 'ph ph-sun' : 'ph ph-desktop';
    }
    
    showToast(`Theme: ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)}`, 'info');
}

// Cycle through layouts for header icon button
function cycleLayout() {
    const layouts = ['list', 'hybrid', 'grid'];
    const currentIndex = layouts.indexOf(userSettings.layout);
    const nextLayout = layouts[(currentIndex + 1) % layouts.length];
    
    changeLayout(nextLayout);
    
    // Update icon
    const icon = document.querySelector('#layout-toggle-btn i');
    if (icon) {
        icon.className = nextLayout === 'list' ? 'ph ph-list' :
                        nextLayout === 'grid' ? 'ph ph-grid-four' : 'ph ph-cards';
    }
    
    showToast(`Layout: ${nextLayout.charAt(0).toUpperCase() + nextLayout.slice(1)}`, 'info');
}

function applyTheme(theme) {
    themeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
    
    // Update header icon
    const headerIcon = document.querySelector('#theme-toggle-btn i');
    if (headerIcon) {
        headerIcon.className = theme === 'dark' ? 'ph ph-moon' : 
                              theme === 'light' ? 'ph ph-sun' : 'ph ph-desktop';
    }
    
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (theme === 'light') {
        document.body.classList.remove('dark-mode');
    } else {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-mode', systemDark);
    }
}

function applyLayout(layout) {
    layoutBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.layout === layout));
    
    // Update header icon
    const headerIcon = document.querySelector('#layout-toggle-btn i');
    if (headerIcon) {
        headerIcon.className = layout === 'list' ? 'ph ph-list' :
                              layout === 'grid' ? 'ph ph-grid-four' : 'ph ph-cards';
    }
    
    resourceList.className = 'resource-grid';
    resourceList.classList.add(`view-${layout}`);
}

// ==========================================
// 7. SEARCH & FILTER
// ==========================================
function handleSearch(e) {
    const query = e.target.value.trim();
    clearSearchBtn.classList.toggle('hidden', query === '');
    
    const category = getActiveCategory();
    runFilter(query, category);
}

function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    runFilter('', getActiveCategory());
    searchInput.focus();
}

function handleFilterChange(e) {
    const chip = e.target;
    document.querySelector('.filter-chip.active').classList.remove('active');
    chip.classList.add('active');
    runFilter(searchInput.value.toLowerCase(), chip.getAttribute('data-filter'));
}

function getActiveCategory() {
    return document.querySelector('.filter-chip.active').getAttribute('data-filter');
}

function runFilter(query, category) {
    let filtered = allResources;
    
    // Apply category filter
    if (category !== 'all') {
        filtered = filtered.filter(item => 
            item.category.toLowerCase().includes(category.toLowerCase())
        );
    }
    
    // Apply fuzzy search
    if (query) {
        filtered = fuzzySearch(filtered, query, ['title', 'category', 'description', 'author']);
    }
    
    renderList(filtered);
}

// ==========================================
// 8. RENDER RESOURCE LIST
// ==========================================
function renderList(items) {
    resourceList.innerHTML = '';
    
    if (items.length === 0) {
        resourceList.innerHTML = `
            <div style="text-align: center; color: var(--text-light); padding: 2rem;">
                <i class="ph ph-magnifying-glass" style="font-size: 3rem; opacity: 0.3;"></i>
                <p style="margin-top: 1rem;">No resources found</p>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('tabindex', '0');

        // Visual content (Thumbnail vs Icon)
        let visualContent = '';
        
        if (item.thumbnail) {
            const thumbnailUrl = sanitizeHTML(item.thumbnail);
            visualContent = `
                <div class="card-thumbnail" style="background-image: url('${thumbnailUrl}');"></div>
            `;
            card.classList.add('has-thumbnail');
        } else {
            let iconClass = 'ph-file-text';
            let colorClass = 'icon-default';
            
            const iconMap = {
                'pdf': { icon: 'ph-file-pdf', color: 'icon-red' },
                'video': { icon: 'ph-film-strip', color: 'icon-blue' },
                'audio': { icon: 'ph-headphones', color: 'icon-purple' },
                'image': { icon: 'ph-image', color: 'icon-green' }
            };
            
            if (iconMap[item.type]) {
                iconClass = iconMap[item.type].icon;
                colorClass = iconMap[item.type].color;
            }
            
            visualContent = `<div class="card-icon"><i class="ph-duotone ${iconClass} ${colorClass}"></i></div>`;
        }

        // Build card (using textContent for safety)
        card.innerHTML = visualContent;
        
        const cardInfo = document.createElement('div');
        cardInfo.className = 'card-info';
        
        const title = document.createElement('h3');
        title.textContent = item.title; // Safe from XSS
        
        const meta = document.createElement('p');
        meta.textContent = `${item.category} • ${item.size}`; // Safe from XSS
        
        cardInfo.appendChild(title);
        cardInfo.appendChild(meta);
        card.appendChild(cardInfo);
        
        const shareBtn = document.createElement('button');
        shareBtn.className = 'action-btn share-btn';
        shareBtn.setAttribute('aria-label', 'Share');
        shareBtn.innerHTML = '<i class="ph-bold ph-share-network"></i>';
        card.appendChild(shareBtn);

        // Event Listeners
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.share-btn')) {
                openViewer(item);
            }
        });

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
// 9. VIEWER LOGIC
// ==========================================
async function openViewer(item) {
    currentResource = item;
    viewerTitle.textContent = item.title;
    downloadBtn.onclick = () => downloadFile(item.path, item.filename);
    
    // Hide all other views
    const allViews = [libraryView, shareView, exportView, aboutView, helpView];
    allViews.forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });
    
    viewerView.classList.remove('hidden');
    viewerView.classList.add('active');
    
    history.pushState({ view: 'viewer', item: item.id }, null, '#viewer');
    pdfContainer.innerHTML = '';

    // Render based on type
    if (item.type === 'pdf') await renderPDF(item.path);
    else if (item.type === 'video') renderVideo(item);
    else if (item.type === 'audio') renderAudio(item);
    else if (item.type === 'image') renderImage(item);
    else renderFallback(item);
}

function closeViewer() {
    viewerView.classList.remove('active');
    viewerView.classList.add('hidden');
    
    // Cleanup
    const media = pdfContainer.querySelector('video, audio');
    if (media) media.pause();
    
    pdfDoc = null;
    currentPage = 1;
    totalPages = 0;
    
    setTimeout(() => { pdfContainer.innerHTML = ''; }, 300);
}

// PDF Rendering with Pagination (Memory efficient)
async function renderPDF(url) {
    try {
        pdfContainer.innerHTML = '<div style="color:white; padding:20px; text-align:center;"><i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i><br>Loading PDF...</div>';
        
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        
        pdfContainer.innerHTML = '';
        
        // Render first few pages initially
        const initialPages = Math.min(5, totalPages);
        for (let i = 1; i <= initialPages; i++) {
            await renderPage(i);
        }
        
        // Setup scroll-based lazy loading for remaining pages
        if (totalPages > initialPages) {
            setupLazyPDFLoading(initialPages + 1);
        }
        
    } catch (err) {
        console.error('PDF Error:', err);
        pdfContainer.innerHTML = `<div style="color:#ef4444; padding:20px;">Error loading PDF: ${sanitizeHTML(err.message)}</div>`;
    }
}

async function renderPage(pageNum) {
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: CONSTANTS.PDF_SCALE });
        
        const canvas = document.createElement('canvas');
        canvas.dataset.page = pageNum;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        pdfContainer.appendChild(canvas);
    } catch (err) {
        console.error(`Error rendering page ${pageNum}:`, err);
    }
}

function setupLazyPDFLoading(startPage) {
    let currentLoadPage = startPage;
    let isLoading = false;
    
    const loadMorePages = async () => {
        if (isLoading || currentLoadPage > totalPages) return;
        
        const scrollPosition = pdfContainer.scrollTop + pdfContainer.clientHeight;
        const scrollHeight = pdfContainer.scrollHeight;
        
        // Load more when scrolled to 80%
        if (scrollPosition > scrollHeight * 0.8) {
            isLoading = true;
            
            const pagesToLoad = Math.min(3, totalPages - currentLoadPage + 1);
            for (let i = 0; i < pagesToLoad; i++) {
                if (currentLoadPage <= totalPages) {
                    await renderPage(currentLoadPage);
                    currentLoadPage++;
                }
            }
            
            isLoading = false;
        }
    };
    
    pdfContainer.addEventListener('scroll', debounce(loadMorePages, 200));
}

function renderVideo(item) {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '1rem';
    
    const video = document.createElement('video');
    video.src = item.path;
    video.controls = true;
    video.style.maxWidth = '100%';
    video.style.borderRadius = '8px';
    
    wrapper.appendChild(video);
    pdfContainer.appendChild(wrapper);
    
    setTimeout(() => video.focus(), 500);
}

function renderAudio(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'audio-player-wrapper';
    wrapper.style.cssText = `
        max-width: 600px;
        margin: 2rem auto;
        padding: 2rem;
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1));
        border-radius: 1rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    // Cover Art Container
    const coverArt = document.createElement('div');
    coverArt.className = 'audio-cover-art';
    coverArt.style.cssText = `
        width: 250px;
        height: 250px;
        margin: 0 auto 2rem;
        border-radius: 1rem;
        background: linear-gradient(135deg, #a855f7, #3b82f6);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 16px rgba(168, 85, 247, 0.3);
        position: relative;
        overflow: hidden;
    `;
    
    // Animated icon in cover art
    const icon = document.createElement('i');
    icon.className = 'ph-duotone ph-music-notes';
    icon.style.cssText = `
        font-size: 8rem;
        color: white;
        animation: pulse 2s infinite;
        opacity: 0.9;
    `;
    
    coverArt.appendChild(icon);
    
    // Title
    const title = document.createElement('h2');
    title.textContent = item.title;
    title.style.cssText = `
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text);
        text-align: center;
    `;
    
    // Audio Element Container
    const audioContainer = document.createElement('div');
    audioContainer.style.cssText = `
        background: var(--surface);
        padding: 1.5rem;
        border-radius: 0.75rem;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    `;
    
    const audio = document.createElement('audio');
    audio.src = item.path;
    audio.controls = true;
    audio.style.cssText = `
        width: 100%;
        height: 60px;
        border-radius: 0.5rem;
    `;
    
    audioContainer.appendChild(audio);
    
    wrapper.appendChild(coverArt);
    wrapper.appendChild(title);
    wrapper.appendChild(audioContainer);
    pdfContainer.appendChild(wrapper);
    
    setTimeout(() => audio.focus(), 500);
}

function renderImage(item) {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '1rem';
    wrapper.style.textAlign = 'center';
    
    const img = document.createElement('img');
    img.src = item.path;
    img.alt = item.title;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    
    wrapper.appendChild(img);
    pdfContainer.appendChild(wrapper);
}

function renderFallback(item) {
    const div = document.createElement('div');
    div.style.textAlign = 'center';
    div.style.color = 'white';
    div.style.padding = '2rem';
    
    div.innerHTML = `
        <i class="ph-duotone ph-warning-circle" style="font-size:4rem; color:#fbbf24; margin-bottom:1rem;"></i>
        <h3>Preview not available</h3>
        <p style="color: var(--text-light); margin-bottom:2rem;">This file type cannot be previewed in the browser</p>
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.className = 'primary-btn';
    downloadButton.innerHTML = '<i class="ph ph-download-simple"></i> Download File';
    downloadButton.onclick = () => downloadFile(item.path, item.filename);
    
    div.appendChild(downloadButton);
    pdfContainer.appendChild(div);
}

function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ==========================================
// 10. P2P SHARING (WITH SECURITY)
// ==========================================

// Option 1: Share Library File
function startHostingLibraryFile(item) {
    fetch(item.path)
        .then(res => res.blob())
        .then(blob => {
            initiateP2P(blob, item.title, item.type);
        })
        .catch(err => {
            console.error('Failed to load file:', err);
            showNotification('Failed to load file for sharing', 'error');
        });
}

// Option 2: Share Local File (with validation)
function handleLocalFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    localFileInput.value = ''; // Reset for re-selection

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        showNotification(validation.error, 'error');
        return;
    }

    initiateP2P(file, file.name, 'local');
}

// Core P2P Hosting Logic
function initiateP2P(fileBlob, filename, fileType) {
    const pin = generatePIN();
    const peerId = `techbros-${pin}`;

    shareTitle.textContent = "Send File";
    
    // Safely display filename
    const fileNameEl = document.createElement('p');
    fileNameEl.innerHTML = 'Sending: <b></b>';
    fileNameEl.querySelector('b').textContent = filename;
    
    const pinDisplay = document.createElement('div');
    pinDisplay.className = 'pin-display';
    pinDisplay.textContent = pin;
    
    const status = document.createElement('p');
    status.style.fontSize = '0.8rem';
    status.style.color = 'var(--text-light)';
    status.style.marginTop = '1rem';
    status.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Waiting for receiver...';
    
    shareBody.innerHTML = '';
    shareBody.style.textAlign = 'center';
    shareBody.appendChild(fileNameEl);
    shareBody.appendChild(pinDisplay);
    shareBody.appendChild(status);
    
    shareModal.classList.remove('hidden');

    // Start Peer
    if (peer) peer.destroy();
    peer = new Peer(peerId);

    peer.on('connection', (conn) => {
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
                shareBody.innerHTML = '<p style="text-align:center; color:var(--primary);">✅ Sent Successfully!</p>';
            }, 1000);
        });
        
        conn.on('error', (err) => {
            console.error('Connection error:', err);
            showConnectionError('Transfer failed. Connection lost.');
        });
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        showConnectionError(getErrorMessage(err));
    });
}

// P2P Receiving
function startReceiving() {
    shareTitle.textContent = "Receive File";
    
    shareBody.innerHTML = '';
    shareBody.style.textAlign = 'center';
    shareBody.style.padding = '2rem 1rem';
    
    const icon = document.createElement('i');
    icon.className = 'ph-duotone ph-broadcast';
    icon.style.fontSize = '4rem';
    icon.style.color = 'var(--primary)';
    icon.style.marginBottom = '1.5rem';
    icon.style.display = 'block';
    
    const label = document.createElement('p');
    label.textContent = "Enter Sender's PIN:";
    label.style.fontSize = '1.1rem';
    label.style.fontWeight = '500';
    label.style.marginBottom = '1rem';
    label.style.color = 'var(--text)';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'pin-input';
    input.placeholder = '0000';
    input.className = 'pin-input';
    input.maxLength = 4;
    input.style.marginBottom = '1.5rem';
    
    const button = document.createElement('button');
    button.id = 'connect-btn';
    button.className = 'primary-btn';
    button.style.width = '100%';
    button.innerHTML = '<i class=\"ph ph-plug\"></i> Connect & Download';
    
    shareBody.appendChild(icon);
    shareBody.appendChild(label);
    shareBody.appendChild(input);
    shareBody.appendChild(button);
    
    shareModal.classList.remove('hidden');
    setTimeout(() => input.focus(), 100);

    button.onclick = () => connectToPeer(input.value);
}

function connectToPeer(pin) {
    if (pin.length < 4) {
        showNotification('Please enter a 4-digit PIN', 'error');
        return;
    }

    shareBody.innerHTML = `
        <div style="text-align:center;">
            <i class="ph ph-spinner ph-spin" style="font-size:2rem;"></i>
            <p>Connecting to ${sanitizeHTML(pin)}...</p>
        </div>
    `;

    if (peer) peer.destroy();
    peer = new Peer();

    peer.on('open', () => {
        const conn = peer.connect(`techbros-${pin}`);

        conn.on('open', () => {
            shareBody.innerHTML = '<p style="text-align:center;">Connected! Waiting for data...</p>';
        });

        conn.on('data', (data) => {
            handleReceivedFile(data);
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            showConnectionError('Failed to connect. Check PIN and try again.');
        });
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        showConnectionError(getErrorMessage(err));
    });
}

function handleReceivedFile(data) {
    let receivedBlob = data.file;
    
    // Convert to Blob if necessary
    if (receivedBlob instanceof ArrayBuffer) {
        receivedBlob = new Blob([receivedBlob]);
    } else if (!(receivedBlob instanceof Blob)) {
        receivedBlob = new Blob([new Uint8Array(data.file)]);
    }

    const url = URL.createObjectURL(receivedBlob);
    const safeFilename = data.filename.replace(/[<>:"/\\|?*]/g, '_'); // Sanitize filename

    shareBody.innerHTML = '';
    shareBody.style.textAlign = 'center';
    
    const icon = document.createElement('i');
    icon.className = 'ph-duotone ph-file-arrow-down';
    icon.style.fontSize = '4rem';
    icon.style.color = 'var(--primary)';
    icon.style.marginBottom = '1rem';
    
    const text = document.createElement('p');
    text.innerHTML = 'Received <b></b>';
    text.querySelector('b').textContent = safeFilename;
    
    const button = document.createElement('button');
    button.className = 'primary-btn';
    button.style.marginTop = '1rem';
    button.style.width = '100%';
    button.style.backgroundColor = '#22c55e';
    button.innerHTML = '<i class="ph-bold ph-download-simple"></i> Save to Device';
    
    button.onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = safeFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    shareBody.appendChild(icon);
    shareBody.appendChild(text);
    shareBody.appendChild(button);
}

function closeShareModal() {
    shareModal.classList.add('hidden');
    if (peer) {
        peer.destroy();
        peer = null;
    }
}

function showConnectionError(message) {
    shareBody.innerHTML = `
        <div style="text-align:center;">
            <i class="ph ph-warning-circle" style="font-size:3rem; color:#ef4444; margin-bottom:1rem;"></i>
            <p style="color:#ef4444;">${sanitizeHTML(message)}</p>
        </div>
    `;
}

function getErrorMessage(err) {
    const errorMessages = {
        'peer-unavailable': 'Peer not found. Check the PIN and ensure both devices are connected to the internet.',
        'network': 'Network error. Check your connection and firewall settings.',
        'disconnected': 'Connection lost. Please try again.',
        'browser-incompatible': 'Your browser doesn\'t support P2P connections.'
    };
    
    return errorMessages[err.type] || 'Connection error. Restart the app and try again.';
}

// ==========================================
// 11. EXPORT & CACHE MANAGEMENT
// ==========================================
function exportSettings() {
    const data = {
        version: '1.5.1',
        exported: new Date().toISOString(),
        settings: userSettings
    };
    
    downloadJSON(data, 'techbros-settings.json');
    showNotification('Settings exported successfully', 'success');
}

function exportResources() {
    const data = {
        version: '1.5.1',
        exported: new Date().toISOString(),
        resources: allResources
    };
    
    downloadJSON(data, 'techbros-resources.json');
    showNotification('Resources exported successfully', 'success');
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function clearCache() {
    if (!confirm('Are you sure you want to clear all cached files? This will free up storage but you\'ll need to re-download resources.')) {
        return;
    }
    
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        
        // Unregister service worker to prevent update loops
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
        }
        
        showNotification('Cache cleared successfully. Reloading...', 'success');
        setTimeout(() => window.location.reload(true), 1500);
    } catch (err) {
        console.error('Failed to clear cache:', err);
        showNotification('Failed to clear cache', 'error');
    }
}

async function updateStorageInfo() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            const usage = (estimate.usage / (1024 * 1024)).toFixed(2);
            const quota = (estimate.quota / (1024 * 1024 * 1024)).toFixed(2);
            const percent = ((estimate.usage / estimate.quota) * 100).toFixed(1);
            
            storageInfo.innerHTML = `
                Using <strong>${usage} MB</strong> of <strong>${quota} GB</strong> (${percent}%)<br>
                <small style="color: var(--text-light);">Cached resources: ${allResources.length}</small>
            `;
        } catch (err) {
            storageInfo.textContent = 'Storage info unavailable';
        }
    } else {
        storageInfo.textContent = 'Storage API not supported';
    }
}

// ==========================================
// 12. NOTIFICATIONS & ERROR HANDLING
// ==========================================
function showNotification(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : 'var(--primary)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showError(message) {
    resourceList.innerHTML = `
        <div style="text-align: center; color: #ef4444; padding: 2rem;">
            <i class="ph ph-warning-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <p>${sanitizeHTML(message)}</p>
        </div>
    `;
}

// Add slide animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ==========================================
// 13. SERVICE WORKER UPDATE HANDLER
// ==========================================
let updateAvailable = false;
let waitingWorker = null;

function setupServiceWorkerUpdates() {
    if (!('serviceWorker' in navigator)) return;

    // Listen for SW updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updateAvailable) {
            console.log('New service worker activated - reloading...');
            window.location.reload();
        }
    });

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
            console.log('Service Worker updated to version:', event.data.version);
            showNotification(`App updated to v${event.data.version}`, 'success');
        }
    });

    // Check for updates on load
    navigator.serviceWorker.ready.then(registration => {
        // Check for updates immediately
        checkForUpdates(registration);

        // Check for updates every hour
        setInterval(() => {
            checkForUpdates(registration);
        }, 60 * 60 * 1000); // 1 hour

        // Listen for new service worker installing
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('New service worker found, installing...');

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    waitingWorker = newWorker;
                    showUpdateNotification();
                }
            });
        });
    });
}

function checkForUpdates(registration) {
    if (!navigator.onLine) return;
    
    console.log('Checking for updates...');
    registration.update().catch(err => {
        console.error('Failed to check for updates:', err);
    });
}

function showUpdateNotification() {
    updateAvailable = true;

    // Create update notification toast
    const updateToast = document.createElement('div');
    updateToast.id = 'update-toast';
    updateToast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        z-index: 10001;
        animation: slideIn 0.3s ease-out;
        max-width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    updateToast.innerHTML = `
        <div style="display: flex; align-items: start; gap: 1rem;">
            <i class="ph-fill ph-arrow-clockwise" style="font-size: 1.5rem; margin-top: 2px;"></i>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">Update Available!</div>
                <div style="font-size: 0.875rem; opacity: 0.95; margin-bottom: 1rem;">
                    A new version of TechBros is ready. Update now for the latest features and fixes.
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="update-now-btn" style="
                        flex: 1;
                        padding: 0.5rem 1rem;
                        background: white;
                        color: #667eea;
                        border: none;
                        border-radius: 6px;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 0.875rem;
                    ">Update Now</button>
                    <button id="update-later-btn" style="
                        padding: 0.5rem 1rem;
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.875rem;
                    ">Later</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(updateToast);

    // Update now button
    document.getElementById('update-now-btn').onclick = () => {
        updateToast.remove();
        applyUpdate();
    };

    // Later button
    document.getElementById('update-later-btn').onclick = () => {
        updateToast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => updateToast.remove(), 300);
    };
}

function applyUpdate() {
    if (!waitingWorker) return;

    // Show updating message
    const updatingToast = document.createElement('div');
    updatingToast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 2rem 3rem;
        background: var(--surface);
        color: var(--text);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10002;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    updatingToast.innerHTML = `
        <i class="ph ph-spinner ph-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
        <div style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Updating...</div>
        <div style="color: var(--text-light); font-size: 0.875rem;">This will only take a moment</div>
    `;

    document.body.appendChild(updatingToast);

    // Tell the waiting service worker to activate
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

// ==========================================
// 14. INITIALIZE APP
// ==========================================
setupServiceWorkerUpdates();
init();
