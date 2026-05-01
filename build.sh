#!/usr/bin/env bash
set -euo pipefail

# MakeYourMusic — Production Build Script
# Builds backend (TypeScript) and frontend (Next.js) for deployment.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MakeYourMusic — Production Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Install workspace dependencies. Without this, a fresh checkout fails on
# `npx prisma generate` because the prisma CLI / @prisma/client aren't yet
# installed. Railway's own pipeline runs npm ci before invoking this script,
# but local / one-off builds need it.
install_pkg_if_needed() {
    local dir="$1"
    if [ -f "$dir/package.json" ] && [ ! -d "$dir/node_modules" ]; then
        echo "📦 Installing dependencies in $dir..."
        (cd "$dir" && npm ci || npm install)
    fi
}
install_pkg_if_needed "$DIR"
install_pkg_if_needed "$DIR/shared"
install_pkg_if_needed "$DIR/backend"
install_pkg_if_needed "$DIR/frontend"

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

# Build backend
echo "🔧 Building backend..."
cd backend && npm run build
cd "$DIR"

# Build frontend
echo "🔧 Building frontend..."
cd frontend && npm run build
cd "$DIR"

echo ""
echo "✅ Build complete!"
