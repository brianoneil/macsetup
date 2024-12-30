#!/bin/bash

# Print with colors and styling
print_styled() {
    printf "\033[0;34m=== %s ===\033[0m\n" "$1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Initialize
print_styled "Mac Setup Bootstrap"
echo "This script will set up your Mac with essential development tools."

# Install Xcode Command Line Tools if not installed
if ! command_exists xcode-select; then
    print_styled "Installing Xcode Command Line Tools"
    xcode-select --install
    
    # Wait for xcode-select to be installed
    until command_exists xcode-select; do
        echo "Waiting for Xcode Command Line Tools installation..."
        sleep 10
    done
fi

# Install Homebrew if not installed
if ! command_exists brew; then
    print_styled "Installing Homebrew"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Install nvm if not installed
if ! command_exists nvm; then
    print_styled "Installing nvm"
    brew install nvm
    
    # Set up nvm environment
    mkdir -p ~/.nvm
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
    echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
    echo '[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"' >> ~/.zshrc
    
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
fi

# Install Node.js LTS if not installed
if ! command_exists node; then
    print_styled "Installing Node.js LTS"
    nvm install --lts
    nvm use --lts
fi

# Clone and set up the Mac Setup CLI tool
print_styled "Setting up Mac Setup CLI"
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone the repository (you'll need to host this somewhere, like GitHub)
git clone https://github.com/yourusername/mac-setup-cli.git
cd mac-setup-cli

# Install dependencies and link the CLI tool
npm install
npm link

# Clean up
cd
rm -rf "$TEMP_DIR"

print_styled "Bootstrap Complete!"
echo "You can now run 'mac-setup' to configure your Mac."
echo "Please start a new terminal session for all changes to take effect." 