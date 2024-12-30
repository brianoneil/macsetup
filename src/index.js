#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import { execa } from 'execa';
import ora from 'ora';
import boxen from 'boxen';
import { parseArgs } from 'node:util';

const { values: { report = false } } = parseArgs({
  options: {
    report: {
      type: 'boolean',
      short: 'r',
    }
  }
});

const CATEGORIES = {
  DEVELOPMENT: 'Development Tools',
  PRODUCTIVITY: 'Productivity Apps',
  UTILITIES: 'Utilities'
};

const apps = {
  vscode: {
    name: 'Visual Studio Code',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        await execa('mdfind', ['kMDItemCFBundleIdentifier = "com.microsoft.VSCode"']);
        return true;
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
        await execa('mdfind', ['kMDItemCFBundleIdentifier = "com.google.Chrome"']);
        return true;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', '--cask', 'google-chrome']);
    }
  },
  iterm2: {
    name: 'iTerm2',
    category: CATEGORIES.DEVELOPMENT,
    check: async () => {
      try {
        await execa('mdfind', ['kMDItemCFBundleIdentifier = "com.googlecode.iterm2"']);
        return true;
      } catch {
        return false;
      }
    },
    install: async () => {
      await execa('brew', ['install', '--cask', 'iterm2']);
    }
  },
  // Add all your other apps here...
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
    notInstalled: []
  };

  // Group apps by category
  const appsByCategory = Object.entries(apps).reduce((acc, [key, app]) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push({ key, ...app });
    return acc;
  }, {});

  // Check installation status for all apps
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

  // Print summary
  console.log(boxen(
    chalk.bold('\nSummary:\n') +
    chalk.green(`✓ Installed: ${results.installed.length} apps\n`) +
    chalk.red(`✗ Not Installed: ${results.notInstalled.length} apps`),
    { padding: 1, margin: { top: 1 }, borderStyle: 'round' }
  ));

  return results;
}

async function main() {
  // If --report flag is used, only generate the report
  if (report) {
    await generateReport();
    return;
  }

  console.log(boxen(chalk.bold.blue('Mac Setup CLI'), { padding: 1, margin: 1, borderStyle: 'double' }));

  // First check and install Homebrew as it's required for other installations
  const isBrewInstalled = await checkInstallation(apps.brew);
  if (!isBrewInstalled) {
    const { installBrew } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'installBrew',
        message: 'Homebrew is required but not installed. Would you like to install it?',
        default: true
      }
    ]);

    if (installBrew) {
      const spinner = ora('Installing Homebrew...').start();
      try {
        await apps.brew.install();
        spinner.succeed('Homebrew installed successfully');
      } catch (error) {
        spinner.fail('Failed to install Homebrew');
        console.error(error);
        process.exit(1);
      }
    } else {
      console.log(chalk.yellow('Homebrew is required to continue. Exiting...'));
      process.exit(0);
    }
  }

  // Get user selection for other apps
  const { selectedApps } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedApps',
      message: 'Select applications to install:',
      choices: Object.entries(apps)
        .filter(([key]) => key !== 'brew')
        .map(([key, app]) => ({
          name: app.name,
          value: key,
          checked: false
        }))
    }
  ]);

  // Install selected apps
  for (const appKey of selectedApps) {
    const app = apps[appKey];
    const isInstalled = await checkInstallation(app);

    if (isInstalled) {
      console.log(chalk.green(`✓ ${app.name} is already installed`));
      continue;
    }

    const spinner = ora(`Installing ${app.name}...`).start();
    try {
      await app.install();
      spinner.succeed(`${app.name} installed successfully`);
    } catch (error) {
      spinner.fail(`Failed to install ${app.name}`);
      console.error(error);
    }
  }
}

main().catch(error => {
  console.error(chalk.red('An error occurred:'), error);
  process.exit(1);
}); 