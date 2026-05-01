#!/usr/bin/env bash
set -euo pipefail

# MakeYourMusic — Dependency Installation Script
# Installs dependencies for all packages (root, backend, frontend, shared, mobile).

echo "════════════════════════════════════════"
echo "   🎵 MakeYourMusic — Dependency Install"
echo "════════════════════════════════════════"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 22+ first."
    exit 1
fi

# Strip any non-numeric suffix (e.g. v22.0.0-nightly) before comparing.
NODE_VERSION_RAW=$(node -v | sed 's/^v//')
NODE_VERSION_MAJOR=$(echo "$NODE_VERSION_RAW" | cut -d'.' -f1 | sed 's/[^0-9].*//')
if [ -z "$NODE_VERSION_MAJOR" ] || [ "$NODE_VERSION_MAJOR" -lt 22 ]; then
    echo "❌ Node.js 22+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Resolve script directory so cd .. doesn't bleed across packages.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

install_pkg() {
    local name="$1"
    local dir="$2"
    if [ ! -d "$dir" ]; then
        echo "⚠️  Skipping $name — directory $dir not found"
        return 0
    fi
    if [ ! -f "$dir/package.json" ]; then
        echo "⚠️  Skipping $name — no package.json in $dir"
        return 0
    fi
    echo "📦 Installing $name dependencies..."
    (cd "$dir" && npm install) || { echo "❌ $name installation failed"; exit 1; }
}

install_pkg "root"     "$SCRIPT_DIR"
install_pkg "shared"   "$SCRIPT_DIR/shared"
install_pkg "backend"  "$SCRIPT_DIR/backend"
install_pkg "frontend" "$SCRIPT_DIR/frontend"
install_pkg "mobile"   "$SCRIPT_DIR/mobile"

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
