#!/bin/bash

# Open ERP - Dependency Installation Script
# Note: You can also use: ./start.sh --install

echo "════════════════════════════════════════"
echo "   🚀 Open ERP - Dependency Install"
echo "════════════════════════════════════════"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend installation failed"
    exit 1
fi

cd ..

echo ""
echo "════════════════════════════════════════"
echo "✅ Installation Complete!"
echo "════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Configure your .env.local file in frontend/"
echo "  2. Run: ./start.sh"
echo ""
echo "Or run everything at once:"
echo "  ./start.sh --install"
cd ..

echo ""
echo "════════════════════════════════════════"
echo "✅ Installation Complete!"
echo "════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Configure your .env.local file in frontend/"
echo "  2. Run: ./start.sh"
echo ""
echo "Or run everything at once:"
echo "  ./start.sh --install"
echo ""
