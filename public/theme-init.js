(function() {
    const saved = localStorage.getItem('techbros_settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            if (settings && settings.theme) {
                document.documentElement.setAttribute('data-theme', settings.theme);
            }
        } catch (e) {}
    }
})();
