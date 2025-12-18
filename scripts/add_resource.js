import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import inquirer from 'inquirer';
import chalk from 'chalk';

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
    console.log(chalk.blue.bold('\n--- TechBros Batch Ingest Tool ---\n'));

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

    // 3. DIFF LOGIC (Find ALL new files)
    const newFiles = files.filter(file => {
        if (file.startsWith('.')) return false; // Ignore .DS_Store
        const existsInDb = db.some(entry => entry.filename === file);
        const type = detectType(file);
        return !existsInDb && type !== 'unknown';
    });

    if (newFiles.length === 0) {
        console.log(chalk.green('✔ No new files found.'));
        return;
    }

    console.log(chalk.yellow(`\nFound ${newFiles.length} new file(s) to process.`));

    // 4. ASK USER: BATCH OR SELECT?
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
                message: 'Select files to process (Space to select, Enter to confirm):',
                choices: newFiles
            }
        ]);
        queue = selection;
    }

    if (queue.length === 0) {
        console.log('No files selected.');
        return;
    }

    // 5. THE BATCH LOOP
    console.log(chalk.bold(`\nStarting Batch Processing for ${queue.length} files...`));
    
    for (let i = 0; i < queue.length; i++) {
        const filename = queue[i];
        const currentNum = i + 1;
        const total = queue.length;
        
        console.log(chalk.white.bold(`\n--------------------------------------------------`));
        console.log(chalk.bgBlue.white.bold(` FILE ${currentNum}/${total} `) + ` ${filename}`);
        console.log(chalk.white.bold(`--------------------------------------------------`));

        await processSingleFile(filename, db);
    }

    console.log(chalk.green.bold(`\n✨ Batch Complete! Processed ${queue.length} files.`));
}

// 6. INDIVIDUAL FILE PROCESSOR
async function processSingleFile(selectedFile, db) {
    const filePath = path.join(RESOURCES_DIR, selectedFile);
    const fileType = detectType(selectedFile);
    
    // Calculate Size
    const stats = await fs.stat(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

    // Metadata Extraction
    let metaTitle = '';
    let metaAuthor = '';
    
    if (fileType === 'pdf') {
        process.stdout.write(chalk.gray(`Scanning PDF metadata... `));
        try {
            const fileBuffer = await fs.readFile(filePath);
            const pdfDoc = await PDFDocument.load(fileBuffer);
            metaTitle = pdfDoc.getTitle();
            metaAuthor = pdfDoc.getAuthor();
            console.log(metaTitle ? chalk.green('Found!') : chalk.yellow('None found.'));
        } catch (e) {
            console.log(chalk.yellow("Encrypted/Invalid PDF."));
        }
    }

    // User Inputs
    const defaultTitle = metaTitle || selectedFile.replace(/\.[^/.]+$/, "").replace(/-/g, ' ');

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'title',
            message: 'Title:',
            default: defaultTitle
        },
        {
            type: 'input', // Changed from list to input for speed in batch mode
            name: 'category',
            message: 'Category:',
            default: 'General' 
        },
        {
            type: 'input',
            name: 'description',
            message: 'Description (Optional):'
        }
    ]);

    // Construct Object
    const newResource = {
        id: Date.now().toString(), // Unique ID
        title: answers.title,
        author: metaAuthor || 'Unknown', // Skipped prompt for speed, defaults to PDF meta or Unknown
        category: answers.category,
        description: answers.description || '',
        filename: selectedFile,
        path: `/resources/${selectedFile}`,
        size: sizeMB,
        type: fileType,
        date_added: new Date().toISOString().split('T')[0]
    };

    // SAVE IMMEDIATELY (Incremental Save)
    db.push(newResource);
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    
    console.log(chalk.green(`✔ Saved.`));
}

main().catch(err => console.error(chalk.red(err)));