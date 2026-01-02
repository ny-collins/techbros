import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { parseFile } from 'music-metadata';

/* === CONFIG === */

const BUCKET_NAME = 'techbros-uploads';
const RESOURCES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/resources');
const DB_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/resources.json');
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB - matches server validation
const UPLOAD_TIMEOUT = 300000; // 5 minutes for large files

/* === UTILS === */

const runCommand = (command, args) => {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { stdio: 'inherit', shell: true, timeout: UPLOAD_TIMEOUT });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
        proc.on('error', (error) => {
            if (error.code === 'ETIMEDOUT') {
                reject(new Error('Upload timed out after 5 minutes'));
            } else {
                reject(error);
            }
        });
    });
};

const validateFileForUpload = (filePath, stats) => {
    const filename = path.basename(filePath);
    
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return { valid: false, error: 'Invalid filename characters' };
    }
    
    if (stats.size > MAX_FILE_SIZE) {
        return { valid: false, error: `File exceeds 500MB limit` };
    }
    
    if (stats.size === 0) {
        return { valid: false, error: 'File is empty' };
    }
    
    return { valid: true };
};

const formatSize = (bytes) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
};

const extractCover = async (filePath, filename) => {
    try {
        const metadata = await parseFile(filePath);
        const picture = metadata.common.picture ? metadata.common.picture[0] : null;
        
        if (picture) {
            const coverFilename = `${filename}.cover.jpg`;
            const coverPath = path.join(RESOURCES_DIR, coverFilename);
            fs.writeFileSync(coverPath, picture.data);
            return { hasCover: true, coverPath, coverFilename };
        }
    } catch (err) {
        console.warn(chalk.gray(`  ! Could not extract cover for ${filename}`));
    }
    return { hasCover: false, coverPath: null, coverFilename: null };
};

/* === MAIN === */

async function main() {
    console.clear();
    console.log(chalk.cyan.bold('☁️  TechBros Smart R2 Uploader'));
    console.log(chalk.gray(`    Target Bucket: ${BUCKET_NAME}`));
    console.log(chalk.gray('    ---------------------------------------\n'));

    if (!fs.existsSync(RESOURCES_DIR)) {
        console.log(chalk.red('✘ Resources directory missing!'));
        process.exit(1);
    }

    // Filter out existing .cover.jpg files so we don't double-process
    const files = fs.readdirSync(RESOURCES_DIR).filter(f => !f.startsWith('.') && !f.endsWith('.cover.jpg'));
    const largeFiles = files.map(f => {
        const stats = fs.statSync(path.join(RESOURCES_DIR, f));
        return { name: f, size: stats.size };
    }).sort((a, b) => b.size - a.size);

    if (largeFiles.length === 0) {
        console.log(chalk.green('✓ No files found in public/resources (excluding covers).'));
        return;
    }

    const { selectedFiles } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selectedFiles',
            message: 'Select files to upload to R2 (Cloud):',
            choices: largeFiles.map(f => ({
                name: `${f.name} (${chalk.yellow(formatSize(f.size))})`,
                value: f.name
            })),
            pageSize: 15
        }
    ]);

    if (selectedFiles.length === 0) {
        console.log(chalk.yellow('No files selected.'));
        return;
    }

    console.log(chalk.gray('\n---------------------------------------'));

    for (const filename of selectedFiles) {
        const localPath = path.join(RESOURCES_DIR, filename);
        if (!fs.existsSync(localPath)) continue;
        
        const stats = fs.statSync(localPath);
        
        // Validate file size and format
        if (stats.size > 500 * 1024 * 1024) {
            console.log(chalk.red(`⚠️  Skipping ${filename}: File exceeds 500MB limit`));
            continue;
        }
        
        if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
            console.log(chalk.red(`⚠️  Skipping ${filename}: Invalid filename characters`));
            continue;
        }

        console.log(chalk.blue(`\n⬆️  Processing ${filename}... (${formatSize(stats.size)})`));

        // 1. Extract Cover (if audio)
        let coverInfo = { hasCover: false };
        if (filename.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
            process.stdout.write(chalk.gray('  - Extracting cover art... '));
            coverInfo = await extractCover(localPath, filename);
            console.log(coverInfo.hasCover ? chalk.green('Found') : chalk.gray('None'));
        }

        try {
            // 2. Upload Main File with retry
            console.log(chalk.gray('  - Uploading file...'));
            
            let uploadSuccess = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await runCommand('npx', [
                        'wrangler', 'r2', 'object', 'put', 
                        `${BUCKET_NAME}/${filename}`, 
                        '--file', localPath, 
                        '--remote'
                    ]);
                    uploadSuccess = true;
                    break;
                } catch (error) {
                    console.log(chalk.yellow(`    Attempt ${attempt}/3 failed: ${error.message}`));
                    if (attempt === 3) throw error;
                    console.log(chalk.gray('    Retrying in 2 seconds...'));
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // 3. Upload Cover (if extracted)
            if (coverInfo.hasCover) {
                console.log(chalk.gray('  - Uploading cover...'));
                await runCommand('npx', [
                    'wrangler', 'r2', 'object', 'put', 
                    `${BUCKET_NAME}/${coverInfo.coverFilename}`, 
                    '--file', coverInfo.coverPath, 
                    '--remote'
                ]);
            }

            console.log(chalk.green(`✓ Success.`));

            // 4. Cleanup
            const { shouldDelete } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'shouldDelete',
                    message: `Delete local files for ${filename}?`,
                    default: true
                }
            ]);

            if (shouldDelete) {
                fs.unlinkSync(localPath);
                if (coverInfo.hasCover && fs.existsSync(coverInfo.coverPath)) {
                    fs.unlinkSync(coverInfo.coverPath);
                }

                // Remove from local resources.json
                if (fs.existsSync(DB_PATH)) {
                    let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
                    const initialLen = db.length;
                    db = db.filter(item => !item.url.endsWith(`/${filename}`));
                    if (db.length !== initialLen) {
                        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
                    }
                }
                console.log(chalk.yellow(`  - Local files deleted.`));
            }

        } catch (error) {
            console.error(chalk.red(`✘ Error: ${error.message}`));
        }
    }

    console.log(chalk.green('\n✨ All operations complete.'));
}

main().catch(console.error);