import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import inquirer from 'inquirer';
import chalk from 'chalk';
import pdf2img from 'pdf-img-convert'; // NEW: Image Generator

// CONFIGURATION
const RESOURCES_DIR = './public/resources';
const DB_FILE = './public/resources.json';

// Helper: robust type detection
function detectType(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    if (['.pdf'].includes(ext)) return 'pdf';
    if (['.mp4', '.webm', '.mkv', '.mov'].includes(ext)) return 'video';
    if (['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].includes(ext)) return 'audio';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'image';
    if (['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.zip'].includes(ext)) return 'document';
    
    return 'unknown';
}

async function main() {
    console.log(chalk.blue.bold('\n--- TechBros Batch Ingest Tool (v2.0) ---\n'));

    // 1. LOAD DATABASE
    let db = [];
    try {
        const dbContent = await fs.readFile(DB_FILE, 'utf-8');
        db = JSON.parse(dbContent);
        console.log(chalk.gray(`Loaded ${db.length} existing resources.`));
    } catch (error) {
        db = [];
    }

    // 2. SCAN DIRECTORY
    let files = [];
    try {
        files = await fs.readdir(RESOURCES_DIR);
    } catch (err) {
        console.log(chalk.red(`Error: Could not read directory ${RESOURCES_DIR}`));
        return;
    }

    // 3. DIFF LOGIC
    // We filter out files that are already in DB OR are thumbnail images themselves
    const newFiles = files.filter(file => {
        if (file.startsWith('.')) return false; 
        if (file.endsWith('.cover.jpg')) return false; // Ignore generated thumbnails
        
        const existsInDb = db.some(entry => entry.filename === file);
        const type = detectType(file);
        return !existsInDb && type !== 'unknown';
    });

    if (newFiles.length === 0) {
        console.log(chalk.green('✔ No new resources found.'));
        return;
    }

    console.log(chalk.yellow(`\nFound ${newFiles.length} new file(s) to process.`));

    // 4. ASK USER
    const { mode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'How do you want to proceed?',
            choices: [
                { name: `Process ALL ${newFiles.length} files (Batch Mode)`, value: 'batch' },
                { name: 'Select specific files', value: 'select' },
                { name: 'Exit', value: 'exit' }
            ]
        }
    ]);

    if (mode === 'exit') return;

    let queue = [];
    if (mode === 'batch') {
        queue = newFiles;
    } else {
        const { selection } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selection',
                message: 'Select files to process:',
                choices: newFiles
            }
        ]);
        queue = selection;
    }

    if (queue.length === 0) return;

    // 5. BATCH LOOP
    console.log(chalk.bold(`\nStarting Batch Processing...`));
    
    for (let i = 0; i < queue.length; i++) {
        const filename = queue[i];
        console.log(chalk.white.bold(`\n--- FILE ${i + 1}/${queue.length}: ${filename} ---`));
        await processSingleFile(filename, db);
    }

    console.log(chalk.green.bold(`\n✨ Batch Complete!`));
}

// 6. INDIVIDUAL PROCESSOR
async function processSingleFile(selectedFile, db) {
    const filePath = path.join(RESOURCES_DIR, selectedFile);
    const fileType = detectType(selectedFile);
    
    const stats = await fs.stat(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

    let metaTitle = '';
    let metaAuthor = '';
    let thumbnailUrl = ''; // New Field

    // --- PDF SPECIFIC LOGIC (Metadata + Thumbnail) ---
    if (fileType === 'pdf') {
        process.stdout.write(chalk.gray(`Processing PDF... `));
        
        // A. Metadata
        try {
            const fileBuffer = await fs.readFile(filePath);
            const pdfDoc = await PDFDocument.load(fileBuffer);
            metaTitle = pdfDoc.getTitle();
            metaAuthor = pdfDoc.getAuthor();
        } catch (e) { /* Ignore encryption errors */ }

        // B. Thumbnail Generation
        try {
            process.stdout.write(chalk.gray(`Generating Cover... `));
            
            // Convert Page 1 to Image
            const outputImages = await pdf2img.convert(filePath, {
                width: 400, // Reasonable size for mobile grid
                height: 600,
                page_numbers: [1], // Only first page
                base64: false
            });

            // Save the image
            const thumbnailName = selectedFile + '.cover.jpg';
            const thumbnailPath = path.join(RESOURCES_DIR, thumbnailName);
            
            // pdf-img-convert returns a Uint8Array, we write it to disk
            await fs.writeFile(thumbnailPath, outputImages[0]);
            
            thumbnailUrl = `/resources/${thumbnailName}`;
            console.log(chalk.green('Done! 🖼️'));

        } catch (e) {
            console.log(chalk.red(`Thumbnail Failed: ${e.message}`));
        }
    }

    const defaultTitle = metaTitle || selectedFile.replace(/\.[^/.]+$/, "").replace(/-/g, ' ');

    const answers = await inquirer.prompt([
        { type: 'input', name: 'title', message: 'Title:', default: defaultTitle },
        { type: 'input', name: 'category', message: 'Category:', default: 'General' },
        { type: 'input', name: 'description', message: 'Description (Optional):' }
    ]);

    const newResource = {
        id: Date.now().toString(),
        title: answers.title,
        author: metaAuthor || 'Unknown',
        category: answers.category,
        description: answers.description || '',
        filename: selectedFile,
        path: `/resources/${selectedFile}`,
        thumbnail: thumbnailUrl, // <--- New Field
        size: sizeMB,
        type: fileType,
        date_added: new Date().toISOString().split('T')[0]
    };

    db.push(newResource);
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    console.log(chalk.green(`✔ Saved.`));
}

main().catch(err => console.error(chalk.red(err)));