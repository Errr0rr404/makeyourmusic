#!/bin/bash
set -e

echo "🚀 Starting Railway build process..."

# Install root dependencies (includes Prisma)
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies (this will trigger postinstall which generates Prisma)
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Build backend
echo "🏗️  Building backend..."
npm run build

echo "✅ Build complete!"
