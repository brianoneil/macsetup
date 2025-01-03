# Mac Setup CLI

A command-line tool to automate Mac development environment setup.

## TL;DR

```bash
# Install and run
curl -fsSL https://raw.githubusercontent.com/brianoneil/macsetup/main/bootstrap.sh | bash
mac-setup

# Or just see what's installed/missing
mac-setup --report

# To uninstall mac-setup
npm unlink mac-setup
rm -rf ~/macsetup
```

## Installation

1. Run the bootstrap script:
```bash
curl -fsSL https://raw.githubusercontent.com/brianoneil/macsetup/main/bootstrap.sh | bash
```

2. Start a new terminal session for all changes to take effect.

## Usage

### Basic Installation
```bash
mac-setup
```
This will:
- Check for SSH keys first
- Install Homebrew if needed
- Show a list of available applications to install
- Install selected applications

### Check Current Status
```bash
mac-setup --report
# or
mac-setup -r
```
Shows what's installed and what's missing, grouped by:
- Development Tools
- Productivity Apps
- Utilities
- System Configuration

### Dry Run Mode
```bash
mac-setup --dry-run
# or
mac-setup -d
```
Simulates the installation process without making any changes.

### Uninstall
```bash
# Uninstall using the CLI
mac-setup --uninstall
# or
mac-setup -u

# Or manually
npm unlink mac-setup
rm -rf ~/macsetup
```

## What Gets Installed

### Development Tools
- Homebrew
- Node.js (via NVM)
- Visual Studio Code
- Docker
- Cursor
- Git Configuration
- Xcode

### Productivity Apps
- Slack
- Obsidian

### Utilities
- Google Chrome
- Spectacle
- Shottr
- Hovrly
- Amphetamine

### System Configuration
- SSH Keys Setup
- Git Configuration
- Node Modules Permissions

## Development

```bash
# Clone the repository
git clone https://github.com/brianoneil/macsetup.git
cd macsetup

# Install dependencies
npm install

# Run in development
npm run dev

# Run report in development
npm run report
```

## Uninstallation

To remove mac-setup from your system:

```bash
# Unlink the CLI tool
npm unlink mac-setup

# Remove the repository
rm -rf ~/macsetup
```

Note: This only removes the mac-setup tool itself. Any applications or configurations installed using mac-setup will remain on your system.
