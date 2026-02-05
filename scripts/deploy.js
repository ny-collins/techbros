import { spawn } from 'child_process';
import chalk from 'chalk';

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

const deploy = async () => {
    console.clear();
    console.log(chalk.cyan.bold('🚀 TechBros Library Deployment'));
    console.log(chalk.gray('    Deploying to Cloudflare Pages'));
    console.log(chalk.gray('    -------------------------------\n'));
    
    await checkPrerequisites();
    
    try {
        // Build the project
        console.log(chalk.blue('\n📦 Building project...'));
        await runCommand('npm', ['run', 'build']);
        console.log(chalk.green('  ✓ Build completed'));
        
        // Deploy to Cloudflare Pages
        console.log(chalk.blue('\n🌐 Deploying to Cloudflare Pages...'));
        await runCommand('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', 'techbros', '--commit-dirty=true']);
        
        console.log(chalk.green('\n🎉 Deployment successful!'));
        console.log(chalk.gray('   Your app is now live at: https://techbros.pages.dev'));
    } catch (error) {
        console.error(chalk.red('\n❌ Deployment failed:'), error.message);
        process.exit(1);
    }
};

deploy().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
});