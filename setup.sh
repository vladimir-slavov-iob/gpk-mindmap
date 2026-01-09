#!/bin/bash

# Setup script for GPK Mind Map application
# This script checks for dependencies and helps with installation

echo "================================================"
echo "  ГПК Mind Map - Setup Script"
echo "================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo ""
    echo "Please install Node.js using one of these methods:"
    echo ""
    echo "Option 1: Using NodeSource (recommended)"
    echo "  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    echo ""
    echo "Option 2: Using nvm"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  source ~/.bashrc"
    echo "  nvm install --lts"
    echo ""
    exit 1
else
    echo "✅ Node.js is installed: $(node --version)"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    echo "Please install npm (usually comes with Node.js)"
    exit 1
else
    echo "✅ npm is installed: $(npm --version)"
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "⚠️  Python 3 is not installed (needed for parsing)"
    echo "Install with: sudo apt-get install python3"
else
    echo "✅ Python 3 is installed: $(python3 --version)"
fi

echo ""
echo "================================================"
echo "  Installing Dependencies"
echo "================================================"
echo ""

# Install npm dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully"
    else
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "================================================"
echo "  Checking Data"
echo "================================================"
echo ""

# Check if GPK data exists
if [ ! -f "src/data/gpk_data.json" ]; then
    echo "⚠️  GPK data not found. Parsing text..."
    if command -v python3 &> /dev/null; then
        python3 parse_gpk.py
        if [ $? -eq 0 ]; then
            echo "✅ Data parsed successfully"
        else
            echo "❌ Failed to parse data"
            exit 1
        fi
    else
        echo "❌ Python 3 is required for parsing"
        exit 1
    fi
else
    echo "✅ GPK data already exists"
fi

echo ""
echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "The application will open at http://localhost:3000"
echo ""
echo "For production build, run:"
echo "  npm run build"
echo ""
echo "For more information, see README.md"
echo ""
