import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createRequire } from 'module';
import { parseFile } from 'music-metadata'; 

// Use 'require' for legacy CJS libraries
const require = createRequire(import.meta.url);
const { PDFDocument } = require('pdf-lib'); 

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESOURCES_DIR = path.join(__dirname, '../public/resources');
const DB_PATH = path.join(__dirname, '../public/resources.json');

// Supported Mime Types Map
const TYPE_MAP = {
    '.pdf': 'pdf',
    '.mp4': 'video', '.webm': 'video', '.mkv': 'video',
    '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio', '.ogg': 'audio',
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.webp': 'image', '.gif': 'image'
};

// --- Helpers ---

const formatSize = (bytes) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
};

const getPdfMetadata = async (filePath) => {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(dataBuffer, { updateMetadata: false });
        const title = pdfDoc.getTitle();
        return { Title: title, title: title };
    } catch (err) {
        return null;
    }
};

const getAudioMetadata = async (filePath, filename) => {
    try {
        const metadata = await parseFile(filePath);
        const title = metadata.common.title;
        const picture = metadata.common.picture ? metadata.common.picture[0] : null;
        let coverUrl = null;

        if (picture) {
            const coverFilename = `${filename}.cover.jpg`;
            const coverPath = path.join(RESOURCES_DIR, coverFilename);
            fs.writeFileSync(coverPath, picture.data);
            coverUrl = `/resources/${coverFilename}`;
        }

        return { title, coverUrl };
    } catch (err) {
        return { title: null, coverUrl: null };
    }
};

// --- Main Logic ---

async function main() {
    console.clear();
    console.log(chalk.cyan.bold('📚  TechBros Resource Manager v2.0.0'));
    console.log(chalk.gray('    Offline-First Library Management System'));
    console.log(chalk.gray('    ---------------------------------------\n'));

    // 1. Database Check
    let db = [];
    if (fs.existsSync(DB_PATH)) {
        try {
            db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            console.log(chalk.green(`✓ Database loaded (${db.length} resources)`));
        } catch (e) {
            console.log(chalk.red('✘ Database corrupted. Starting new.'));
        }
    } else {
        console.log(chalk.yellow('! No database found. Creating new.'));
    }

    // 2. Scan Directory
    if (!fs.existsSync(RESOURCES_DIR)) {
        console.log(chalk.red('✘ Resources directory missing!'));
        process.exit(1);
    }

    const files = fs.readdirSync(RESOURCES_DIR).filter(f => !f.startsWith('.') && !f.includes('.cover.'));
    const dbUrls = new Set(db.map(entry => entry.url));
    const newFiles = files.filter(f => !dbUrls.has(`/resources/${f}`));

    if (newFiles.length === 0) {
        console.log(chalk.green('\n✓ All files are indexed. No action needed.'));
        return;
    }

    // 3. Selection Step (Checkbox Style)
    console.log(chalk.blue(`\n🔎 Found ${newFiles.length} new unindexed file(s).`));
    
    const { selectedFiles } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selectedFiles',
            message: 'Select files to add to the library:',
            choices: newFiles.map(file => ({ name: file, value: file, checked: true })),
            pageSize: 15
        }
    ]);

    if (selectedFiles.length === 0) {
        console.log(chalk.yellow('\nNo files selected. Exiting.'));
        return;
    }

    console.log(chalk.gray('\n---------------------------------------'));

    // 4. Process Selected Files
    const updates = [];

    for (const file of selectedFiles) {
        const filePath = path.join(RESOURCES_DIR, file);
        const stats = fs.statSync(filePath);
        const ext = path.extname(file).toLowerCase();
        const detectedType = TYPE_MAP[ext] || 'file';
        
        let detectedTitle = path.basename(file, ext).replace(/_/g, ' ');
        let detectedCover = null;

        process.stdout.write(chalk.gray(`\nProcessing: ${file}... `));

        // PDF Metadata
        if (detectedType === 'pdf') {
            const pdfInfo = await getPdfMetadata(filePath);
            if (pdfInfo) {
                const candidate = pdfInfo.Title || pdfInfo.title;
                if (candidate && candidate.trim() !== '' && candidate !== 'Untitled') {
                    detectedTitle = candidate.trim();
                }
            }
        }
        // Audio Metadata
        else if (detectedType === 'audio') {
            const audioData = await getAudioMetadata(filePath, file);
            if (audioData.title) detectedTitle = audioData.title;
            if (audioData.coverUrl) detectedCover = audioData.coverUrl;
        }

        console.log(chalk.cyan('Done'));

        // Confirm details for this file (Optional: Remove this if you want zero-touch)
        // Keeping it allows you to fix bad titles even after batch selection.
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'title',
                message: `   Display Title [${detectedTitle}]:`,
                default: detectedTitle
            },
            {
                type: 'list',
                name: 'type',
                message: '   Resource Type:',
                choices: ['pdf', 'video', 'audio', 'image', 'file'],
                default: detectedType
            }
        ]);

        // Check for existing cover on disk
        const coverName = `${file}.cover.jpg`;
        let coverUrl = fs.existsSync(path.join(RESOURCES_DIR, coverName)) 
            ? `/resources/${coverName}` 
            : detectedCover;

        const entry = {
            id: Math.random().toString(36).substr(2, 9),
            title: answers.title.trim(),
            type: answers.type,
            url: `/resources/${file}`,
            size: stats.size,
            cover: coverUrl,
            added: new Date().toISOString()
        };

        db.push(entry);
        updates.push(entry.title);
        console.log(chalk.green(`   ✓ Added`));
    }

    // 5. Save Database
    if (updates.length > 0) {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        console.log(chalk.green(`\n\n💾 Database saved successfully! (${updates.length} new items)`));
        updates.forEach(t => console.log(chalk.gray(`   + ${t}`)));
    } else {
        console.log(chalk.yellow('\nNo changes made to database.'));
    }
}

main().catch(err => {
    console.error(chalk.red('Fatal Error:'), err);
});