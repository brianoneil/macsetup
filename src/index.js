#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import { execa } from 'execa';
import ora from 'ora';
import boxen from 'boxen';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    report: {
      type: 'boolean',
      short: 'r',
      default: false
    },
    'dry-run': {
      type: 'boolean',
      short: 'd',
      default: false,
      description: 'Run in dry-run mode (no actual installations)'
    },
    uninstall: {
      type: 'boolean',
      short: 'u',
      default: false,
      description: 'Uninstall mac-setup'
    }
  },
  allowPositionals: false
});

const report = values.report;
const dryRun = values['dry-run'];
const uninstall = values.uninstall;

const CATEGORIES = {
  DEVELOPMENT: 'Development Tools',
  PRODUCTIVITY: 'Productivity Apps',
  UTILITIES: 'Utilities',
  CONFIGURATION: 'System Configuration'
};

async function checkAppExists(bundleId) {
  try {
    const result = await execa('mdfind', [`kMDItemCFBundleIdentifier = "${bundleId}"`]);
    return result.stdout.length > 0;
  } catch {
    return false;
  }
}

async function checkMasApp(appId) {
  try {
    const { stdout } = await execa('mas', ['list']);
    return stdout.split('\n').some(line => line.startsWith(appId));
  } catch {
    return false;
  }
}

async function checkAppStoreLogin() {
  try {
    const { stdout } = await execa('mas', ['account']);
    return stdout.length > 0 && !stdout.includes('Not signed in');
  } catch {
    return false;
  }
}

const apps = {
  brew: {
    name: 'Homebrew',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        await execa('brew', ['--version']);
        return true;
      } catch {
        return false;
      }
    },
    install: async () => {
      const command = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
      await execa('bash', ['-c', command]);
      await execa('bash', ['-c', `echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile`]);
      await execa('bash', ['-c', `eval "$(/opt/homebrew/bin/brew shellenv)"`]);
    }
  },
  mas: {
    name: 'Mac App Store CLI',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        // Check if mas is installed AND user is logged in
        const masInstalled = await execa('brew', ['list', 'mas'])
          .then(() => true)
          .catch(() => false);
        
        if (!masInstalled) return false;
        
        // Check App Store login
        const isLoggedIn = await checkAppStoreLogin();
        return isLoggedIn;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', 'mas']);
      
      // Check if user is signed into Mac App Store
      const isLoggedIn = await checkAppStoreLogin();
      if (!isLoggedIn) {
        console.log(chalk.yellow('\nIMPORTANT: You need to sign into the Mac App Store first.'));
        console.log(chalk.yellow('Please open the App Store app and sign in, then press Enter to continue.'));
        
        await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueAfterLogin',
            message: 'Have you signed into the Mac App Store?',
            default: false
          }
        ]);
        
        // Verify login after user confirmation
        const verifyLogin = await checkAppStoreLogin();
        if (!verifyLogin) {
          throw new Error('Still not signed into the Mac App Store. Please sign in and try again.');
        }
      }
    }
  },
  ohmyzsh: {
    name: 'Oh My Zsh',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        // Check if .oh-my-zsh directory exists in home directory
        const { stdout } = await execa('ls', ['-la', process.env.HOME + '/.oh-my-zsh']);
        return stdout.length > 0;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('sh', ['-c', '$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)']);
    }
  },
  nvm: {
    name: 'Node Version Manager',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        // Multiple checks for NVM installation
        const checks = {
          // Check Homebrew installation
          brew: await execa('brew', ['list', 'nvm'])
            .then(() => true)
            .catch(() => false),
          
          // Check NVM directory
          dir: await execa('test', ['-d', `${process.env.HOME}/.nvm`])
            .then(() => true)
            .catch(() => false),
          
          // Check if nvm is loaded in current shell
          shell: await execa('bash', ['-ic', 'command -v nvm'])
            .then(() => true)
            .catch(() => false),
          
          // Check if node is installed (as a proxy for working nvm)
          node: await execa('which', ['node'])
            .then(() => true)
            .catch(() => false)
        };
        
        // Consider NVM installed if either:
        // 1. Homebrew shows it's installed and the directory exists
        // 2. The directory exists and we can find node (suggesting NVM is working)
        return (checks.brew && checks.dir) || (checks.dir && checks.node);
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', 'nvm']);
      await execa('mkdir', ['-p', '~/.nvm']);
      const nvm_dir = `export NVM_DIR="$HOME/.nvm"`;
      const nvm_load = `[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \\. "/opt/homebrew/opt/nvm/nvm.sh"`;
      const nvm_completion = `[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \\. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"`;
      await execa('bash', ['-c', `echo '${nvm_dir}' >> ~/.zshrc`]);
      await execa('bash', ['-c', `echo '${nvm_load}' >> ~/.zshrc`]);
      await execa('bash', ['-c', `echo '${nvm_completion}' >> ~/.zshrc`]);
    }
  },
  node: {
    name: 'Node.js (LTS)',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        await execa('node', ['--version']);
        return true;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('nvm', ['install', '--lts']);
      await execa('nvm', ['use', '--lts']);
    }
  },
  vscode: {
    name: 'Visual Studio Code',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        const checks = {
          brew: await execa('brew', ['list', '--cask', 'visual-studio-code'])
            .then(() => true)
            .catch(() => false),
          app: await execa('test', ['-d', '/Applications/Visual Studio Code.app'])
            .then(() => true)
            .catch(() => false),
          bundle: await checkAppExists('com.microsoft.VSCode')
            .then(() => true)
            .catch(() => false)
        };
        return checks.brew || checks.app || checks.bundle;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', '--cask', 'visual-studio-code']);
    }
  },
  chrome: {
    name: 'Google Chrome',
    category: CATEGORIES.UTILITIES,
    check: async () => {
      try {
        const checks = {
          brew: await execa('brew', ['list', '--cask', 'google-chrome'])
            .then(() => true)
            .catch(() => false),
          app: await execa('test', ['-d', '/Applications/Google Chrome.app'])
            .then(() => true)
            .catch(() => false),
          bundle: await checkAppExists('com.google.Chrome')
            .then(() => true)
            .catch(() => false)
        };
        return checks.brew || checks.app || checks.bundle;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', '--cask', 'google-chrome']);
    }
  },
  spectacle: {
    name: 'Spectacle',
    category: CATEGORIES.UTILITIES,
    check: async () => {
      try {
        await execa('brew', ['list', '--cask', 'spectacle']);
        return true;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', '--cask', 'spectacle']);
    }
  },
  obsidian: {
    name: 'Obsidian',
    category: CATEGORIES.PRODUCTIVITY,
    check: async () => {
      return await checkAppExists('md.obsidian');
    },
    install: async () => {
      await execa('brew', ['install', '--cask', 'obsidian']);
    }
  },
  shottr: {
    name: 'Shottr',
    category: CATEGORIES.UTILITIES,
    check: async () => {
      try {
        await execa('brew', ['list', '--cask', 'shottr']);
        return true;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', '--cask', 'shottr']);
    }
  },
  hovrly: {
    name: 'Hovrly',
    category: CATEGORIES.UTILITIES,
    check: async () => {
      try {
        await execa('brew', ['list', 'hovrly']);
        return true;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', 'hovrly']);
    }
  },
  amphetamine: {
    name: 'Amphetamine',
    category: CATEGORIES.UTILITIES,
    check: async () => {
      return await checkMasApp('937984704');
    },
    install: async () => {
      await execa('mas', ['install', '937984704']);
    }
  },
  slack: {
    name: 'Slack',
    category: CATEGORIES.PRODUCTIVITY,
    check: async () => {
      return await checkMasApp('803453959');
    },
    install: async () => {
      await execa('mas', ['install', '803453959']);
    }
  },
  xcode: {
    name: 'Xcode',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      return await checkMasApp('497799835');
    },
    install: async () => {
      await execa('mas', ['install', '497799835']);
    }
  },
  git: {
    name: 'Git Configuration',
    category: CATEGORIES.CONFIGURATION,
    check: async () => {
      try {
        const { stdout: name } = await execa('git', ['config', '--global', 'user.name']);
        const { stdout: email } = await execa('git', ['config', '--global', 'user.email']);
        const { stdout: color } = await execa('git', ['config', '--global', 'color.ui']);
        
        return name.trim() === 'boneil' && 
               email.trim() === 'brian.oneil@gmail.com' && 
               color.trim() === 'auto';
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('git', ['config', '--global', 'user.name', 'boneil']);
      await execa('git', ['config', '--global', 'user.email', 'brian.oneil@gmail.com']);
      await execa('git', ['config', '--global', 'color.ui', 'auto']);
    }
  },
  gitCompletion: {
    name: 'Git Bash Completion',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        await execa('brew', ['list', 'bash-completion']);
        return true;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', 'git', 'bash-completion']);
    }
  },
  sshKeys: {
    name: 'SSH Keys Setup',
    category: CATEGORIES.CONFIGURATION,
    check: async () => {
      try {
        // Check for any existing SSH keys
        const { stdout } = await execa('ls', ['-la', `${process.env.HOME}/.ssh`]);
        return stdout.includes('id_') && (
          stdout.includes('id_rsa') || 
          stdout.includes('id_ed25519') || 
          stdout.includes('id_ecdsa')
        );
      } catch {
        return false;
      }
    },
    install: async () => {
      console.log(chalk.yellow('\nSecure SSH Key Transfer Instructions:'));
      
      console.log(chalk.bold('\nStep 1: On your source machine'));
      console.log('Package and encode your SSH keys:');
      console.log(chalk.green('cd ~/.ssh'));
      console.log(chalk.green('tar -C ~/.ssh -czf - . | base64 > ~/ssh_backup.txt'));
      console.log('\nCopy the contents of ~/ssh_backup.txt');
      
      console.log(chalk.bold('\nStep 2: On this machine'));
      console.log('Create the SSH directory:');
      console.log(chalk.green('mkdir -p ~/.ssh'));
      console.log(chalk.green('chmod 700 ~/.ssh'));
      console.log(chalk.green('cd ~/.ssh'));
      
      console.log('\nCreate and paste into the restore file:');
      console.log(chalk.green('nano ~/ssh_restore.txt'));
      console.log('(Paste the contents and save with Ctrl+O, Ctrl+X)');
      
      console.log('\nRestore the SSH keys:');
      console.log(chalk.green(`base64 -D -i ~/ssh_restore.txt | tar xzf - -C ./`));
      
      console.log('\nSet proper permissions:');
      console.log(chalk.green('chmod 600 ~/.ssh/id_*'));
      console.log(chalk.green('chmod 644 ~/.ssh/*.pub'));
      
      console.log('\nClean up:');
      console.log(chalk.green('rm ~/ssh_restore.txt'));

      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Have you completed these steps?',
          default: false
        }
      ]);

      if (proceed) {
        try {
          // Create .ssh directory if it doesn't exist
          await execa('mkdir', ['-p', `${process.env.HOME}/.ssh`]);
          await execa('chmod', ['700', `${process.env.HOME}/.ssh`]);

          // Try to restore the keys
          try {
            await execa('bash', ['-c', `cd ${process.env.HOME}/.ssh && base64 -D -i ${process.env.HOME}/ssh_restore.txt | tar xzf - -C ./`]);
          } catch (error) {
            console.error(chalk.yellow('\nFailed to automatically restore keys. Please follow the manual steps above.'));
            throw error;
          }
          
          // Set proper permissions
          await execa('chmod', ['600', `${process.env.HOME}/.ssh/id_*`]);
          await execa('chmod', ['644', `${process.env.HOME}/.ssh/*.pub`]);

          // Clean up
          await execa('rm', [`${process.env.HOME}/ssh_restore.txt`]);

          // Verify keys are properly installed
          const hasKeys = await apps.sshKeys.check();
          if (!hasKeys) {
            throw new Error('SSH keys were not properly installed. Please try again.');
          }
        } catch (error) {
          console.error(chalk.red('Error setting up SSH keys:'), error.message);
          throw error;
        }
      }
    }
  },
  nodeModules: {
    name: 'Node Modules Permissions',
    category: CATEGORIES.CONFIGURATION,
    check: async () => {
      try {
        const { stdout } = await execa('ls', ['-la', '/usr/local/lib/node_modules']);
        return stdout.includes(process.env.USER);
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('sudo', ['chown', '-R', process.env.USER, '/usr/local/lib/node_modules']);
    }
  },
  cursor: {
    name: 'Cursor',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        // Multiple checks for Cursor installation
        const checks = {
          // Check Homebrew installation
          brew: await execa('brew', ['list', '--cask', 'cursor'])
            .then(() => true)
            .catch(() => false),
          
          // Check Application directory
          app: await execa('test', ['-d', '/Applications/Cursor.app'])
            .then(() => true)
            .catch(() => false),
          
          // Check using bundle identifier
          bundle: await checkAppExists('com.cursor.Cursor')
            .then(() => true)
            .catch(() => false)
        };
        
        // Consider Cursor installed if any check passes
        return checks.brew || checks.app || checks.bundle;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', '--cask', 'cursor']);
    }
  },
  docker: {
    name: 'Docker',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        const checks = {
          // Check Homebrew installation
          brew: await execa('brew', ['list', '--cask', 'docker'])
            .then(() => true)
            .catch(() => false),
          
          // Check Application directory
          app: await execa('test', ['-d', '/Applications/Docker.app'])
            .then(() => true)
            .catch(() => false),
          
          // Check using bundle identifier
          bundle: await checkAppExists('com.docker.docker')
            .then(() => true)
            .catch(() => false),

          // Check if docker CLI is available and daemon is running
          cli: await execa('docker', ['info'])
            .then(() => true)
            .catch(() => false)
        };
        
        // Consider Docker installed if any check passes
        return checks.brew || checks.app || checks.bundle || checks.cli;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', '--cask', 'docker']);
      console.log(chalk.yellow('\nNOTE: You\'ll need to start Docker Desktop manually after installation.'));
    }
  }
};

async function checkInstallation(app) {
  const spinner = ora(`Checking if ${chalk.blue(app.name)} is installed...`).start();
  const isInstalled = await app.check();
  spinner.stop();
  return isInstalled;
}

async function generateReport() {
  console.log(boxen(chalk.bold.blue('Mac Setup Installation Report'), { padding: 1, margin: 1, borderStyle: 'double' }));
  
  const results = {
    installed: [],
    notInstalled: [],
    configuredCorrectly: [],
    needsConfiguration: []
  };

  // Group apps and configs separately
  const appsByCategory = Object.entries(apps)
    .filter(([_, app]) => app.category !== CATEGORIES.CONFIGURATION)
    .reduce((acc, [key, app]) => {
      if (!acc[app.category]) {
        acc[app.category] = [];
      }
      acc[app.category].push({ key, ...app });
      return acc;
    }, {});

  const configurations = Object.entries(apps)
    .filter(([_, app]) => app.category === CATEGORIES.CONFIGURATION)
    .map(([key, app]) => ({ key, ...app }));

  // Check apps first
  for (const [category, categoryApps] of Object.entries(appsByCategory)) {
    console.log(chalk.bold(`\n${category}:`));
    
    for (const app of categoryApps) {
      const spinner = ora(`Checking ${app.name}...`).start();
      const isInstalled = await app.check();
      
      if (isInstalled) {
        spinner.succeed(chalk.green(`${app.name} is installed`));
        results.installed.push(app.name);
      } else {
        spinner.fail(chalk.red(`${app.name} is not installed`));
        results.notInstalled.push(app.name);
      }
    }
  }

  // Check configurations separately
  if (configurations.length > 0) {
    console.log(chalk.bold('\nSystem Configuration:'));
    
    for (const config of configurations) {
      const spinner = ora(`Checking ${config.name}...`).start();
      const isConfigured = await config.check();
      
      if (isConfigured) {
        spinner.succeed(chalk.green(`${config.name} is properly configured`));
        results.configuredCorrectly.push(config.name);
      } else {
        spinner.fail(chalk.yellow(`${config.name} needs configuration`));
        results.needsConfiguration.push(config.name);
      }
    }
  }

  // Print summary with separate counts for apps and configurations
  console.log(boxen(
    chalk.bold('\nSummary:\n') +
    chalk.bold('Applications:\n') +
    chalk.green(`✓ Installed: ${results.installed.length} apps\n`) +
    chalk.red(`✗ Not Installed: ${results.notInstalled.length} apps\n\n`) +
    chalk.bold('System Configuration:\n') +
    chalk.green(`✓ Configured: ${results.configuredCorrectly.length} items\n`) +
    chalk.yellow(`⚠ Needs Configuration: ${results.needsConfiguration.length} items`),
    { padding: 1, margin: { top: 1 }, borderStyle: 'round' }
  ));

  return results;
}

async function checkMasRequirement(app, isDryRun) {
  if (app.install.toString().includes('mas install')) {
    const isMasInstalled = await apps.mas.check();
    if (!isMasInstalled) {
      console.log(chalk.yellow('Mac App Store CLI (mas) is required for this installation.'));
      const { installMas } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installMas',
          message: 'Would you like to install mas?',
          default: true
        }
      ]);

      if (installMas) {
        const success = await installApp(apps.mas, isDryRun);
        if (!success) {
          throw new Error('Failed to install mas. Cannot proceed with App Store installation.');
        }
      } else {
        throw new Error('mas is required for App Store installations.');
      }
    }
  }
}

async function installApp(app, isDryRun = false) {
  const spinner = ora(`${isDryRun ? '[DRY RUN] ' : ''}Installing ${app.name}...`).start();
  try {
    if (!isDryRun) {
      await checkMasRequirement(app, isDryRun);
      await app.install();
      spinner.succeed(`${app.name} was installed successfully`);
    } else {
      spinner.succeed(`[DRY RUN] ${app.name} would be installed successfully`);
    }
    return true;
  } catch (error) {
    spinner.fail(`${isDryRun ? '[DRY RUN] ' : ''}Failed to install ${app.name}`);
    console.error(error.message);
    return false;
  }
}

async function getAppInstallationStatus() {
  const status = new Map();
  for (const [key, app] of Object.entries(apps)) {
    status.set(key, await checkInstallation(app));
  }
  return status;
}

async function uninstallMacSetup() {
  console.log(boxen(
    chalk.bold.red('Uninstalling Mac Setup CLI'),
    { padding: 1, margin: 1, borderStyle: 'double' }
  ));

  const spinner = ora('Uninstalling mac-setup...').start();
  
  try {
    // Unlink the CLI tool
    await execa('npm', ['unlink', 'mac-setup']);
    
    // Remove the repository
    await execa('rm', ['-rf', `${process.env.HOME}/macsetup`]);
    
    spinner.succeed(chalk.green('Mac Setup CLI has been successfully uninstalled'));
    console.log(chalk.yellow('\nNote: Applications and configurations installed using mac-setup remain on your system.'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to uninstall Mac Setup CLI'));
    console.error(error.message);
    process.exit(1);
  }
}

async function main() {
  if (uninstall) {
    const { confirmUninstall } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmUninstall',
        message: 'Are you sure you want to uninstall Mac Setup CLI?',
        default: false
      }
    ]);

    if (confirmUninstall) {
      await uninstallMacSetup();
      return;
    } else {
      console.log(chalk.yellow('Uninstall cancelled'));
      return;
    }
  }

  if (report) {
    await generateReport();
    return;
  }

  console.log(boxen(
    chalk.bold.blue('Mac Setup CLI') + 
    (dryRun ? chalk.yellow('\n[DRY RUN MODE]') : ''), 
    { padding: 1, margin: 1, borderStyle: 'double' }
  ));

  if (dryRun) {
    console.log(chalk.yellow('Running in dry-run mode - no actual installations will be performed'));
  }

  // Check for SSH keys first
  const hasSSHKeys = await checkInstallation(apps.sshKeys);
  if (!hasSSHKeys && !dryRun) {
    console.log(chalk.yellow('\nNo SSH keys found. Setting up SSH keys is recommended before proceeding.'));
    const { setupSSH } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'setupSSH',
        message: 'Would you like to set up SSH keys now?',
        default: true
      }
    ]);

    if (setupSSH) {
      await installApp(apps.sshKeys, dryRun);
    } else {
      console.log(chalk.yellow('\nProceeding without SSH keys. You can set them up later.'));
    }
  }

  // Continue with Homebrew installation and the rest of the setup
  const isBrewInstalled = await checkInstallation(apps.brew);
  if (!isBrewInstalled) {
    const { installBrew } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'installBrew',
        message: `${dryRun ? '[DRY RUN] ' : ''}Homebrew is required but not installed. Would you like to install it?`,
        default: true
      }
    ]);

    if (installBrew) {
      await installApp(apps.brew, dryRun);
    } else {
      console.log(chalk.yellow(`${dryRun ? '[DRY RUN] ' : ''}Homebrew is required to continue. Exiting...`));
      process.exit(0);
    }
  }

  // Get installation status for all apps before showing selection
  const installationStatus = await getAppInstallationStatus();

  // Get user selection for other apps
  const { selectedApps } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedApps',
      message: `${dryRun ? '[DRY RUN] ' : ''}Select applications to install:`,
      choices: [
        new inquirer.Separator(chalk.bold('\n--- Available Apps ---')),
        ...Object.entries(apps)
          .filter(([key]) => key !== 'brew')
          .filter(([key]) => !installationStatus.get(key))
          .map(([key, app]) => ({
            name: app.name,
            value: key,
            checked: false
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        new inquirer.Separator(chalk.bold('\n--- Already Installed ---')),
        ...Object.entries(apps)
          .filter(([key]) => key !== 'brew')
          .filter(([key]) => installationStatus.get(key))
          .map(([key, app]) => ({
            name: `${app.name}${chalk.green(' (installed)')}`,
            value: key,
            checked: false,
            disabled: 'Already installed'
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      ]
    }
  ]);

  // Check App Store login if any selected apps require it
  const hasAppStoreApps = selectedApps.some(appKey => 
    apps[appKey].install.toString().includes('mas install')
  );

  if (hasAppStoreApps && !dryRun) {
    const isLoggedIn = await checkAppStoreLogin();
    if (!isLoggedIn) {
      console.log(chalk.yellow('\nSome selected apps require Mac App Store login.'));
      console.log(chalk.yellow('Please open the App Store app and sign in, then press Enter to continue.'));
      
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Have you signed into the Mac App Store?',
          default: false
        }
      ]);

      if (!proceed) {
        console.log(chalk.yellow('Cannot proceed with App Store installations without login. Skipping those apps...'));
        // Filter out App Store apps from selection
        selectedApps = selectedApps.filter(appKey => 
          !apps[appKey].install.toString().includes('mas install')
        );
      } else {
        // Verify login after user confirmation
        const verifyLogin = await checkAppStoreLogin();
        if (!verifyLogin) {
          console.log(chalk.red('Still not signed into the Mac App Store. App Store installations will be skipped.'));
          selectedApps = selectedApps.filter(appKey => 
            !apps[appKey].install.toString().includes('mas install')
          );
        }
      }
    }
  }

  // Install selected apps
  const results = {
    successful: [],
    failed: [],
    skipped: []
  };

  for (const appKey of selectedApps) {
    const app = apps[appKey];
    const isInstalled = await checkInstallation(app);

    if (isInstalled) {
      console.log(chalk.green(`✓ ${app.name} is already installed`));
      results.skipped.push(app.name);
      continue;
    }

    const success = await installApp(app, dryRun);
    if (success) {
      results.successful.push(app.name);
    } else {
      results.failed.push(app.name);
    }
  }

  // Print summary
  console.log(boxen(
    chalk.bold('\nInstallation Summary:\n') +
    (dryRun ? chalk.yellow('[DRY RUN MODE]\n') : '') +
    chalk.green(`✓ Would be installed: ${results.successful.length} apps\n`) +
    chalk.yellow(`⚠ Already installed: ${results.skipped.length} apps\n`) +
    chalk.red(`✗ Failed: ${results.failed.length} apps`),
    { padding: 1, margin: { top: 1 }, borderStyle: 'round' }
  ));
}

main().catch(error => {
  console.error(chalk.red('An error occurred:'), error);
  process.exit(1);
}); 