#!/bin/bash

# Complete Setup Script for ERP System
# This script runs migrations, generates Prisma client, and seeds the database with all users

set -e

echo "🚀 Starting ERP System Setup..."
echo ""

# Export DATABASE_URL from frontend/.env.local
export DATABASE_URL="postgresql://neondb_owner:npg_3RxZco2kganv@ep-solitary-union-ahb41c0u-pooler.c-3.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

echo "📊 Step 1: Generating Prisma Client..."
cd /Users/zan/payment-template
npx prisma generate --schema=./prisma/schema.prisma

echo ""
echo "🗄️  Step 2: Running Database Migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo ""
echo "🌱 Step 3: Seeding Database with Users..."
cd /Users/zan/payment-template/backend
npm run prisma:seed

echo ""
echo "✅ Setup Complete!"
echo ""
echo "You can now start the servers with:"
echo "  Frontend: cd frontend && npm run dev"
echo "  Backend: cd backend && npm run dev"
