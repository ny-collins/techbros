/* === HANDLER === */

self.onmessage = function(e) {
    const { query, resources } = e.data;

    if (!query) {
        self.postMessage({ results: resources });
        return;
    }

    const lowerQ = query.toLowerCase();
    const MAX_DISTANCE = 3;

    const results = resources.filter(item => {
        const title = item.title.toLowerCase();

        if (title.includes(lowerQ)) return true;

        if (item.description && item.description.toLowerCase().includes(lowerQ)) return true;

        if (lowerQ.length > 2) {
            const dist = levenshtein(lowerQ, title);
            if (dist <= MAX_DISTANCE) return true;
        }

        return false;
    });

    self.postMessage({ results });
};

/* === UTILITIES === */

function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}
