# Mac Setup

## Home Brew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"

# Add to .zshrc
export PATH=/opt/homebrew/bin:$PATH
```

## OhMyZsh
```bash
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

## Install NVM and LTS Node
```bash
brew install nvm

#add to .zshrc
export NVM_DIR="$HOME/.nvm"

[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh" # This loads nvm

[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" # This loads nvm bash_completion

#install node LTS
nvm install --lts
```

## git config
```bash
git config --global user.name "boneil"
git config --global user.email "brian.oneil@gmail.com"
git config --global color.ui auto
```

## Copy ssh keys from Dropbox
```bash
ln -s "Dropbox\ \(Personal\)/ssh" ~/.ssh
mkdir projects
brew install git bash-completion
git_bash_profile .bash_profile
sudo chmod 600 ~/.ssh/id_rsa && sudo chmod 600 ~/.ssh/id_rsa.pub
sudo chown -R $USER /usr/local/lib/node_modules
	
```

## VS Code Setting Sync
Gist ID: `ba5a5bf41183a010cecafb3f3edae218`
gist token  `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`


## Setup Script (untested)
```bash
#!/bin/bash

# Check if Homebrew is already installed
if ! command -v brew > /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
fi

#add brew to the PATH
export PATH=/opt/homebrew/bin:$PATH

echo "export PATH=/opt/homebrew/bin:$PATH" >> ~/.zshrc

echo "Homebrew installed."

# Set Homebrew as the default theme for Terminal 
defaults write com.apple.Terminal "Default Window Settings" -string "Homebrew" 

defaults write com.apple.Terminal "Startup Window Settings" -string "Homebrew"

#install mas to install things from the App Store
echo "Installing mas"
brew install mas

#Amphetamine AppID: 937984704
mas install 937984704
#Slack Desktop AppID: 803453959
mas install 803453959
#XCode AppID: 497799835
mas install 497799835

# Install Google Chrome
if ! command -v google-chrome > /dev/null; then
    echo "Installing Google Chrome..."
    brew install --cask google-chrome
fi

echo "Google Chrome installed."

# Install itsycal
if ! command -v itsycal > /dev/null; then
    echo "Installing itsycal..."
    brew install --cask itsycal
fi

echo "Itsycal installed."


brew install --cask spectacle

echo "spectacle installed"

# Install Visual Studio Code
if ! command -v code > /dev/null; then
    echo "Installing Visual Studio Code..."
    brew install --cask  visual-studio-code
fi

echo "Visual Studio Code installed."

# Install Obsidian
if ! command -v obsidian > /dev/null; then
    echo "Installing Obsidian..."
    brew install --cask obsidian
fi

echo "Obsidian installed."

# Install NVM
if [ ! -d ~/.nvm ]; then
    echo "Installing NVM..."
    brew install nvm
fi

echo "NVM installed."

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Add NVM_DIR information to .zshrc
if ! grep -q "NVM_DIR" ~/.zshrc; then
    echo "export NVM_DIR=\"\$HOME/.nvm\"" >> ~/.zshrc
    echo "[ -s \"\$NVM_DIR/nvm.sh\" ] && \\." >> ~/.zshrc
    echo "\"\$NVM_DIR/nvm.sh\"" >> ~/.zshrc
fi

echo "NVM_DIR information added to .zshrc."

# Install the LTS version of Node.js
if ! command -v node > /dev/null; then
    echo "Installing the LTS version of Node.js..."
    nvm install --lts
fi

echo "The LTS version of Node.js installed."

# Install Oh My Zsh
if [ ! -d ~/.oh-my-zsh ]; then
    echo "Installing Oh My Zsh..."
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
fi

# Install Shottr

if ! command -v shottr > /dev/null; then
    echo "Installing shottr..."
    brew install --cask shottr
fi

if ! command -v hovrly > /dev/null; then
    echo "Installing hovrly (timezone tool)..."
    brew install hovrly
fi



# brew install --cask shottr

echo "Oh My Zsh installed."

echo "Environment Setup"

git config --global user.name "boneil"
git config --global user.email "brian.oneil@gmail.com"
git config --global color.ui auto

```

