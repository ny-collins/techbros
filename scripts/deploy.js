import { spawn } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';

/* === DEPLOYMENT SCRIPT === */

const runCommand = (command, args, options = {}) => {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { 
            stdio: 'inherit', 
            shell: true,
            ...options
        });
        
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
        
        proc.on('error', reject);
    });
};

const checkPrerequisites = async () => {
    console.log(chalk.blue('🔍 Checking prerequisites...'));
    
    try {
        await runCommand('npx', ['wrangler', '--version'], { stdio: 'pipe' });
        console.log(chalk.green('  ✓ Wrangler CLI available'));
    } catch {
        console.log(chalk.red('  ✗ Wrangler CLI not found'));
        console.log(chalk.yellow('    Run: npm install -g wrangler'));
        process.exit(1);
    }
    
    try {
        await runCommand('npx', ['wrangler', 'whoami'], { stdio: 'pipe' });
        console.log(chalk.green('  ✓ Cloudflare authentication verified'));
    } catch {
        console.log(chalk.red('  ✗ Not authenticated with Cloudflare'));
        console.log(chalk.yellow('    Run: npx wrangler login'));
        process.exit(1);
    }
};

const deployToProduction = async () => {
    console.log(chalk.cyan('🚀 Starting production deployment...'));
    
    // Build the project
    console.log(chalk.blue('\n📦 Building project...'));
    await runCommand('npm', ['run', 'build']);
    console.log(chalk.green('  ✓ Build completed'));
    
    // Deploy to Cloudflare Pages
    console.log(chalk.blue('\n🌐 Deploying to Cloudflare Pages...'));
    await runCommand('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', 'techbros']);
    console.log(chalk.green('  ✓ Deployment completed'));
    
    console.log(chalk.green('\\n🎉 Production deployment successful!'));
    console.log(chalk.gray('   Your app is now live at: https://techbros.pages.dev'));
};

const deployPreview = async () => {
    console.log(chalk.cyan('🧪 Creating preview deployment...'));
    
    // Build the project
    console.log(chalk.blue('\\n📦 Building project...'));
    await runCommand('npm', ['run', 'build']);
    console.log(chalk.green('  ✓ Build completed'));
    
    // Deploy preview
    console.log(chalk.blue('\\n🌐 Creating preview...'));
    await runCommand('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', 'techbros']);
    console.log(chalk.green('  ✓ Preview created'));
    
    console.log(chalk.green('\\n✨ Preview deployment successful!'));
    console.log(chalk.gray('   Preview URL will be shown in the output above'));
};

const main = async () => {
    console.clear();
    console.log(chalk.cyan.bold('🚀 TechBros Library Deployment Tool'));
    console.log(chalk.gray('    Cloudflare Pages Deployment Manager'));
    console.log(chalk.gray('    ------------------------------------\\n'));
    
    await checkPrerequisites();
    
    const { deploymentType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'deploymentType',
            message: 'Select deployment type:',
            choices: [
                { name: '🌟 Production deployment (live site)', value: 'production' },
                { name: '🧪 Preview deployment (temporary URL)', value: 'preview' },
                { name: '❌ Cancel', value: 'cancel' }
            ]
        }
    ]);
    
    if (deploymentType === 'cancel') {
        console.log(chalk.yellow('Deployment cancelled.'));
        return;
    }
    
    try {
        if (deploymentType === 'production') {
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Deploy to PRODUCTION? This will update the live site.',
                    default: false
                }
            ]);
            
            if (!confirm) {
                console.log(chalk.yellow('Production deployment cancelled.'));
                return;
            }
            
            await deployToProduction();
        } else {
            await deployPreview();
        }
    } catch (error) {
        console.error(chalk.red('\\n❌ Deployment failed:'), error.message);
        process.exit(1);
    }
};

main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
});