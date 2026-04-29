#!/usr/bin/env bash
set -euo pipefail

# MakeYourMusic — Production Build Script
# Builds backend (TypeScript) and frontend (Next.js) for deployment.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MakeYourMusic — Production Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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
