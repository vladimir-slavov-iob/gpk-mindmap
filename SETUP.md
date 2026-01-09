# Setup Instructions

## Prerequisites

You need Node.js and npm installed on your system.

### Install Node.js (Ubuntu/Debian)

```bash
# Using NodeSource repository for latest LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Alternative: Using nvm (Node Version Manager)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload your shell
source ~/.bashrc

# Install Node.js
nvm install --lts
nvm use --lts

# Verify installation
node --version
npm --version
```

## Running the Application

Once Node.js is installed:

```bash
# Install dependencies
npm install

# Parse the GPK text (already done)
npm run parse

# Start development server
npm run dev
```

The application will open at http://localhost:3000

## Quick Start (without installation)

If you can't install Node.js, you can use a simple HTTP server to serve the pre-built files:

```bash
# Using Python 3
python3 -m http.server 3000
```

However, you'll need to manually create a static build first, which requires Node.js.

## Building for Production

```bash
npm run build
npm run preview
```

The built files will be in the `dist/` directory and can be deployed to any static hosting service.
