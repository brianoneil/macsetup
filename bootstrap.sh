#!/bin/bash

echo "=== Mac Setup Bootstrap ==="
echo "This script will set up your Mac with essential development tools."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to handle errors
handle_error() {
    echo "❌ Error: $1"
    exit 1
}

# Install Xcode Command Line Tools first
echo "=== Installing Xcode Command Line Tools ==="
if ! command_exists xcode-select; then
    xcode-select --install || handle_error "Failed to install Xcode Command Line Tools"
    echo "⚠️  Please wait for Xcode Command Line Tools to finish installing, then run this script again."
    exit 0
fi

# Install Homebrew
echo "=== Installing Homebrew ==="
if ! command_exists brew; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || handle_error "Failed to install Homebrew"
    
    # Add Homebrew to PATH
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo "✓ Homebrew already installed"
fi

# Verify Homebrew is now available
if ! command_exists brew; then
    handle_error "Homebrew installation failed or not in PATH"
fi

# Install Node.js via nvm
echo "=== Installing nvm ==="
if ! command_exists nvm; then
    brew install nvm || handle_error "Failed to install nvm"
    
    # Set up nvm environment
    mkdir -p ~/.nvm
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
    echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
    echo '[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"' >> ~/.zshrc
    
    # Load nvm for current session
    export NVM_DIR="$HOME/.nvm"
    [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
else
    echo "✓ nvm already installed"
fi

# Install Node.js LTS
echo "=== Installing Node.js LTS ==="
if ! command_exists node; then
    # Source nvm if it exists but isn't in PATH
    [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
    nvm install --lts || handle_error "Failed to install Node.js"
    nvm use --lts
else
    echo "✓ Node.js already installed"
fi

# Clone and set up mac-setup CLI
echo "=== Setting up Mac Setup CLI ==="
if [ ! -d "$HOME/macsetup" ]; then
    git clone https://github.com/brianoneil/macsetup.git "$HOME/macsetup" || handle_error "Failed to clone repository"
fi

cd "$HOME/macsetup" || handle_error "Failed to enter repository directory"

# Install dependencies and link
npm install || handle_error "Failed to install npm dependencies"
npm link || handle_error "Failed to link CLI tool"

echo "=== Bootstrap Complete! ==="
echo "✓ You can now run 'mac-setup' to configure your Mac."
echo "⚠️  Please start a new terminal session for all changes to take effect." 