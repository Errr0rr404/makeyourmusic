#!/bin/bash

# MakeYourMusic — Dependency Installation Script
# Installs dependencies for all packages (root, backend, frontend, shared).

echo "════════════════════════════════════════"
echo "   🎵 MakeYourMusic — Dependency Install"
echo "════════════════════════════════════════"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 22+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js 22+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install || { echo "❌ Root installation failed"; exit 1; }

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install || { echo "❌ Backend installation failed"; exit 1; }
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install || { echo "❌ Frontend installation failed"; exit 1; }
cd ..

echo ""
echo "════════════════════════════════════════"
echo "✅ Installation Complete!"
echo "════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Configure backend/.env (see README.md)"
echo "  2. Configure frontend/.env.local"
echo "  3. Run: npm run dev"
echo ""
