(function() {
    const saved = localStorage.getItem('techbros_settings');
    let theme = null;
    
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            if (settings && settings.theme) {
                theme = settings.theme;
            }
        } catch (e) {}
    }
    
    if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-theme', theme);
})();
